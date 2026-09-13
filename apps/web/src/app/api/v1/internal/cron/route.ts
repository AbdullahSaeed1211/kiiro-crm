import config from '@payload-config'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { createDueSoonJob, handleCronRequest, rejectUnauthorized } from '@ops/adapter-cloudflare'
import { createDueItemSource, createNotificationStore, SETTINGS_GLOBAL } from '@ops/adapter-payload'
import { getPayload } from 'payload'

/** Receives the cron trigger the Worker entry forwards and runs the background jobs (spec §13). */
export async function POST(request: Request): Promise<Response> {
  const { env } = await getCloudflareContext({ async: true })
  // Authenticate before touching the database.
  const unauthorized = await rejectUnauthorized(request, env.INTERNAL_SECRET)
  if (unauthorized !== undefined) return unauthorized
  const payload = await getPayload({ config })
  const settings = await payload.findGlobal({ slug: SETTINGS_GLOBAL, depth: 0 })
  const dueSoon = createDueSoonJob({
    source: createDueItemSource(payload),
    notifications: createNotificationStore(payload),
    timeZone: settings.timezone,
  })
  return handleCronRequest(request, { secret: env.INTERNAL_SECRET, jobs: [dueSoon] })
}
