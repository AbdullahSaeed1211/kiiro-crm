/* eslint-disable sonarjs/no-duplicate-string -- job names are persisted protocol identifiers. */
import { ok, type Id } from '@ops/kernel'
import type { NotificationStore, RecordRef } from '@ops/platform'
import type { CronJob } from './cron-job'
import {
  asBatch,
  claim,
  cursorOfJob,
  firstRunAfterNine,
  JOB_LIMIT,
  HOUR_MS,
  DAY_MS,
  localDate,
  localDateChanged,
  localMinutes,
  notificationCount,
  saveCursor,
  startOfLocalDay,
} from './job-support'

/** Stable ordering cursor persisted in `jobRuns` for capped jobs. */
export interface JobCursor {
  readonly updatedAt: number
  readonly id: string
}

/** A capped page and the last row cursor returned by a job source. */
export interface JobBatch<T> {
  readonly rows: readonly T[]
  readonly nextCursor?: JobCursor
}

/** A minimal job-run store. Its unique claim must be backed by `(job, windowStart)` in persistence. */
export interface JobRunStore {
  claim(job: string, window: string): Promise<boolean>
  getCursor?(job: string): Promise<JobCursor | undefined>
  saveCursor?(job: string, cursor: JobCursor | undefined): Promise<void>
}

/** A pending invitation supplied by the jobs composition root. */
export interface ExpiredInvitation {
  readonly id: Id
  readonly expiresAt: number
  readonly updatedAt?: number
}

/** A task or record that can receive a daily notification. */
export interface JobTarget {
  readonly record: RecordRef
  readonly title: string
  readonly ownerId?: Id
  readonly assigneeIds?: readonly Id[]
  readonly stageName?: string
  readonly stalledDays?: number
  readonly updatedAt?: number
  readonly digestLocalTime?: string
}

/** A rejected submission row that can be deleted with cursor continuation. */
export interface RejectedSubmission {
  readonly id: string
  readonly updatedAt: number
}

/** Job data sources. Methods are intentionally narrow so local fixtures need no Payload runtime. */
export interface JobSources {
  listExpiredInvitations?(
    at: number,
    limit: number,
    cursor?: JobCursor,
  ): Promise<readonly ExpiredInvitation[] | JobBatch<ExpiredInvitation>>
  expireInvitation?(id: Id): Promise<void>
  listOverdue?(before: number, limit: number, cursor?: JobCursor): Promise<readonly JobTarget[] | JobBatch<JobTarget>>
  listDigests?(
    localDate: string,
    at: number,
    limit: number,
    cursor?: JobCursor,
  ): Promise<readonly JobTarget[] | JobBatch<JobTarget>>
  listStalled?(before: number, limit: number, cursor?: JobCursor): Promise<readonly JobTarget[] | JobBatch<JobTarget>>
  deleteRejected?(before: number, limit: number, cursor?: JobCursor): Promise<number | JobBatch<RejectedSubmission>>
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

export { startOfLocalDay } from './job-support'

/** Expires pending invitations once per hour. */
export function createInvitationsExpireJob(deps: ScheduledJobsDeps): CronJob {
  return {
    name: 'invitations.expire',
    isDue: (window) => window.end % HOUR_MS === 0,
    run: async (window) => {
      if (!(await claim(deps, 'invitations.expire', window))) return ok({ processed: 0, created: 0, skipped: 0 })
      const page = asBatch(
        await deps.source.listExpiredInvitations?.(
          window.end,
          deps.limit ?? JOB_LIMIT,
          await cursorOfJob(deps, 'invitations.expire'),
        ),
      )
      for (const row of page.rows) await deps.source.expireInvitation?.(row.id)
      await saveCursor({ deps, name: 'invitations.expire', rows: page.rows, next: page.nextCursor })
      return ok({ processed: page.rows.length, created: page.rows.length, skipped: 0 })
    },
  }
}

/** Notifies assignees of open tasks whose due date is before the tenant's local day. */
export function createOverdueJob(deps: ScheduledJobsDeps): CronJob {
  return {
    name: 'tasks.overdue',
    isDue: (window) => firstRunAfterNine(deps.timeZone, window),
    run: async (window) => {
      if (!(await claim(deps, 'tasks.overdue', window))) return ok({ processed: 0, created: 0, skipped: 0 })
      const today = startOfLocalDay(deps.timeZone, window.end)
      const page = asBatch<JobTarget>(
        await deps.source.listOverdue?.(today, deps.limit ?? JOB_LIMIT, await cursorOfJob(deps, 'tasks.overdue')),
      )
      const counts: { readonly created: number; readonly skipped: number } = await notificationCount({
        targets: page.rows,
        type: 'overdue',
        date: localDate(deps.timeZone, window.end),
        notifications: deps.notifications,
      })
      await saveCursor({ deps, name: 'tasks.overdue', rows: page.rows, next: page.nextCursor })
      return ok({ processed: page.rows.length, ...counts })
    },
  }
}

/** Sends each user's configured daily digest after their tenant-local configured time. */
export function createDigestJob(deps: ScheduledJobsDeps): CronJob {
  return {
    name: 'digest.send',
    run: async (window) => {
      if (!(await claim(deps, 'digest.send', window))) return ok({ processed: 0, created: 0, skipped: 0 })
      const date = localDate(deps.timeZone, window.end)
      const page = asBatch<JobTarget>(
        await deps.source.listDigests?.(
          date,
          window.end,
          deps.limit ?? JOB_LIMIT,
          await cursorOfJob(deps, 'digest.send'),
        ),
      )
      const counts: { readonly created: number; readonly skipped: number } = await notificationCount({
        targets: page.rows,
        type: 'digest',
        date,
        notifications: deps.notifications,
        digestMinutes: localMinutes(deps.timeZone, window.end),
      })
      await saveCursor({ deps, name: 'digest.send', rows: page.rows, next: page.nextCursor })
      return ok({ processed: page.rows.length, ...counts })
    },
  }
}

/** Notifies owners of records that have exceeded their configured stalled threshold. */
export function createStalledJob(deps: ScheduledJobsDeps): CronJob {
  return {
    name: 'records.stalled',
    isDue: (window) => firstRunAfterNine(deps.timeZone, window),
    run: async (window) => {
      if (!(await claim(deps, 'records.stalled', window))) return ok({ processed: 0, created: 0, skipped: 0 })
      const page = asBatch<JobTarget>(
        await deps.source.listStalled?.(
          startOfLocalDay(deps.timeZone, window.end),
          deps.limit ?? JOB_LIMIT,
          await cursorOfJob(deps, 'records.stalled'),
        ),
      )
      const counts: { readonly created: number; readonly skipped: number } = await notificationCount({
        targets: page.rows,
        type: 'stalled',
        date: localDate(deps.timeZone, window.end),
        notifications: deps.notifications,
      })
      await saveCursor({ deps, name: 'records.stalled', rows: page.rows, next: page.nextCursor })
      return ok({ processed: page.rows.length, ...counts })
    },
  }
}

/** Deletes rejected submissions older than 30 days, capped so the next run can continue. */
export function createIntakeCleanupJob(deps: ScheduledJobsDeps): CronJob {
  return {
    name: 'intake.cleanup',
    isDue: (window) => localDateChanged(deps.timeZone, window),
    run: async (window) => {
      if (!(await claim(deps, 'intake.cleanup', window))) return ok({ processed: 0, created: 0, skipped: 0 })
      const result = await deps.source.deleteRejected?.(
        window.end - 30 * DAY_MS,
        deps.limit ?? JOB_LIMIT,
        await cursorOfJob(deps, 'intake.cleanup'),
      )
      if (typeof result === 'number') return ok({ processed: result, created: result, skipped: 0 })
      const page = result ?? { rows: [] }
      await saveCursor({ deps, name: 'intake.cleanup', rows: page.rows, next: page.nextCursor })
      return ok({ processed: page.rows.length, created: page.rows.length, skipped: 0 })
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
