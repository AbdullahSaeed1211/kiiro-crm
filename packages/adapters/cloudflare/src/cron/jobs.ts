import { ok, type Id } from '@ops/kernel'
import type { NotificationStore, RecordRef } from '@ops/platform'
import type { CronJob, CronWindow } from './cron-job'
import { localDateFormatter } from './local-date'

/** A minimal job-run store. Its unique claim must be backed by `(job, window)` in persistence. */
export interface JobRunStore {
  claim(job: string, window: string): Promise<boolean>
}

/** A pending invitation supplied by the jobs composition root. */
export interface ExpiredInvitation {
  readonly id: Id
  readonly expiresAt: number
}

/** A task or record that can receive a daily notification. */
export interface JobTarget {
  readonly record: RecordRef
  readonly title: string
  readonly ownerId?: Id
  readonly assigneeIds?: readonly Id[]
  readonly stageName?: string
  readonly stalledDays?: number
}

/** Job data sources. Methods are intentionally narrow so local fixtures need no Payload runtime. */
export interface JobSources {
  listExpiredInvitations?(at: number, limit: number): Promise<readonly ExpiredInvitation[]>
  expireInvitation?(id: Id): Promise<void>
  listOverdue?(before: number, limit: number): Promise<readonly JobTarget[]>
  listDigests?(localDate: string, at: number, limit: number): Promise<readonly JobTarget[]>
  listStalled?(before: number, limit: number): Promise<readonly JobTarget[]>
  deleteRejected?(before: number, limit: number): Promise<number>
}

/** Dependencies shared by the six scheduled jobs. */
export interface ScheduledJobsDeps {
  readonly source: JobSources
  readonly notifications: NotificationStore
  readonly runs?: JobRunStore
  readonly timeZone: string
  readonly now?: () => number
  readonly limit?: number
}

const LIMIT = 200
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const jobWindow = (job: string, window: CronWindow): string => `${job}:${String(window.start)}`
const localDate = (timeZone: string, ms: number): string => localDateFormatter(timeZone)(ms)
const utcStartOfToday = (timeZone: string, ms: number): number => {
  const date = localDate(timeZone, ms)
  const [year, month, day] = date.split('-').map(Number)
  const utc = Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1)
  return utc
}

async function claim(deps: ScheduledJobsDeps, name: string, window: CronWindow): Promise<boolean> {
  return deps.runs === undefined || deps.runs.claim(name, jobWindow(name, window))
}

async function notificationCount(input: {
  readonly targets: readonly JobTarget[]
  readonly type: 'overdue' | 'digest' | 'stalled'
  readonly date: string
  readonly notifications: NotificationStore
}): Promise<{ readonly created: number; readonly skipped: number }> {
  let created = 0
  let attempted = 0
  for (const target of input.targets) {
    const recipients = target.assigneeIds ?? (target.ownerId === undefined ? [] : [target.ownerId])
    for (const userId of recipients) {
      attempted += 1
      const result = await input.notifications.insertIfAbsent({
        userId,
        type: input.type,
        dedupeKey: `${target.record.type}:${target.record.id}:${input.type}:${input.date}:${userId}`,
        record: target.record,
        data: { title: target.title },
      })
      if (result === 'created') created += 1
    }
  }
  return { created, skipped: attempted - created }
}

/** Expires pending invitations once per hour. */
export function createInvitationsExpireJob(deps: ScheduledJobsDeps): CronJob {
  return {
    name: 'invitations.expire',
    isDue: (window) => window.end % HOUR === 0,
    run: async (window) => {
      if (!(await claim(deps, 'invitations.expire', window))) return ok({ processed: 0, created: 0, skipped: 0 })
      const rows = (await deps.source.listExpiredInvitations?.(window.end, deps.limit ?? LIMIT)) ?? []
      for (const row of rows) await deps.source.expireInvitation?.(row.id)
      return ok({ processed: rows.length, created: rows.length, skipped: 0 })
    },
  }
}

/** Notifies assignees of open tasks whose due date is before the tenant's local day. */
export function createOverdueJob(deps: ScheduledJobsDeps): CronJob {
  return {
    name: 'tasks.overdue',
    isDue: (window) => {
      const today = utcStartOfToday(deps.timeZone, window.end)
      return window.start < today && window.end >= today + 9 * HOUR
    },
    run: async (window) => {
      if (!(await claim(deps, 'tasks.overdue', window))) return ok({ processed: 0, created: 0, skipped: 0 })
      const today = utcStartOfToday(deps.timeZone, window.end)
      const rows = (await deps.source.listOverdue?.(today, deps.limit ?? LIMIT)) ?? []
      const counts = await notificationCount({
        targets: rows,
        type: 'overdue',
        date: localDate(deps.timeZone, window.end),
        notifications: deps.notifications,
      })
      return ok({ processed: rows.length, ...counts })
    },
  }
}

/** Sends each user's configured daily digest once for the tenant-local date. */
export function createDigestJob(deps: ScheduledJobsDeps): CronJob {
  return {
    name: 'digest.send',
    run: async (window) => {
      if (!(await claim(deps, 'digest.send', window))) return ok({ processed: 0, created: 0, skipped: 0 })
      const date = localDate(deps.timeZone, window.end)
      const rows = (await deps.source.listDigests?.(date, window.end, deps.limit ?? LIMIT)) ?? []
      const counts = await notificationCount({ targets: rows, type: 'digest', date, notifications: deps.notifications })
      return ok({ processed: rows.length, ...counts })
    },
  }
}

/** Notifies owners of records that have exceeded their configured stalled threshold. */
export function createStalledJob(deps: ScheduledJobsDeps): CronJob {
  return {
    name: 'records.stalled',
    isDue: (window) => {
      const today = utcStartOfToday(deps.timeZone, window.end)
      return window.start < today && window.end >= today + 9 * HOUR
    },
    run: async (window) => {
      if (!(await claim(deps, 'records.stalled', window))) return ok({ processed: 0, created: 0, skipped: 0 })
      const rows = (await deps.source.listStalled?.(window.end, deps.limit ?? LIMIT)) ?? []
      const counts = await notificationCount({
        targets: rows,
        type: 'stalled',
        date: localDate(deps.timeZone, window.end),
        notifications: deps.notifications,
      })
      return ok({ processed: rows.length, ...counts })
    },
  }
}

/** Deletes rejected submissions older than 30 days, capped so the next run can continue. */
export function createIntakeCleanupJob(deps: ScheduledJobsDeps): CronJob {
  return {
    name: 'intake.cleanup',
    isDue: (window) => window.end % DAY === 0,
    run: async (window) => {
      if (!(await claim(deps, 'intake.cleanup', window))) return ok({ processed: 0, created: 0, skipped: 0 })
      const deleted = (await deps.source.deleteRejected?.(window.end - 30 * DAY, deps.limit ?? LIMIT)) ?? 0
      return ok({ processed: deleted, created: deleted, skipped: 0 })
    },
  }
}

/** Builds the complete M3 scheduled-job registry in specification order. */
export function createScheduledJobs(deps: ScheduledJobsDeps, dueSoon: CronJob): readonly CronJob[] {
  return [
    createInvitationsExpireJob(deps),
    dueSoon,
    createOverdueJob(deps),
    createDigestJob(deps),
    createStalledJob(deps),
    createIntakeCleanupJob(deps),
  ]
}
