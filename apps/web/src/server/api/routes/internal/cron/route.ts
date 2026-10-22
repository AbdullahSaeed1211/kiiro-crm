import config from '@payload-config'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import {
  createDueSoonJob,
  createScheduledJobs,
  handleCronRequest,
  rejectUnauthorized,
  type CronJob,
} from '@ops/adapter-cloudflare'
import { ok } from '@ops/kernel'
import {
  createDueItemSource,
  createJobRunStore,
  createJobSources,
  createNotificationStore,
  createScheduleDueItemSource,
  runMonthlyDesignOrders,
  SETTINGS_GLOBAL,
} from '@ops/adapter-payload'
import { getPayload, type Payload } from 'payload'
import { runDailyBackup } from '../../../../backup/daily-backup'
import { sendNextRound } from '../../../../newsletter/queue'
import { catchUpRepeatingTasks } from '../../../../work/repeat-catch-up'

function agencyJobs(payload: Payload, timeZone: string): readonly CronJob[] {
  return [
    {
      name: 'work.monthlyDesign',
      run: async (window) => ok(await runMonthlyDesignOrders(payload, window.end, timeZone)),
    },
    createDueSoonJob({
      name: 'schedule.dueSoon',
      source: createScheduleDueItemSource(payload),
      notifications: createNotificationStore(payload),
      timeZone,
      runs: createJobRunStore(payload),
    }),
  ]
}

/** Receives the cron trigger the Worker entry forwards and runs the background jobs (spec §13). */
export async function POST(request: Request): Promise<Response> {
  const { env } = await getCloudflareContext({ async: true })
  // Authenticate before touching the database.
  const unauthorized = await rejectUnauthorized(request, env.INTERNAL_SECRET)
  if (unauthorized !== undefined) return unauthorized
  const payload = await getPayload({ config })
  const settings = await payload.findGlobal({ slug: SETTINGS_GLOBAL, depth: 0 })
  const runs = createJobRunStore(payload)
  const notifications = createNotificationStore(payload)
  const dueSoon = createDueSoonJob({
    source: createDueItemSource(payload),
    notifications,
    timeZone: settings.timezone,
    runs,
  })
  const jobs = createScheduledJobs(
    {
      source: createJobSources(payload, settings.stalledDays),
      notifications,
      runs,
      timeZone: settings.timezone,
    },
    dueSoon,
  )
  // A newsletter to a long list goes out a round at a time; a failure here must not stop the other jobs.
  await sendNextRound(payload).catch((error: unknown) => {
    console.error('[newsletter.round]', error)
  })
  // A repeating task whose period passed gets a task for each missed period, so none hides behind the first.
  await catchUpRepeatingTasks(payload, Date.now()).catch((error: unknown) => {
    console.error('[tasks.repeat]', error)
  })
  // The daily copy of the database goes to the workspace's own bucket; it skips the day when it already ran.
  await runDailyBackup(env, Date.now()).catch((error: unknown) => {
    console.error('[backup.daily]', error)
  })
  return handleCronRequest(request, {
    secret: env.INTERNAL_SECRET,
    jobs: [...agencyJobs(payload, settings.timezone), ...jobs],
  })
}
