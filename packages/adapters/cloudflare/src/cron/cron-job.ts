import type { Result } from '@ops/kernel'
import type { Id } from '@ops/kernel'
import type { RecordRef } from '@ops/platform'

/** The period one cron run covers: `end` is the trigger's scheduled time, `start` one trigger interval earlier. */
export interface CronWindow {
  readonly start: number
  readonly end: number
}

/** Counts a job reports for one run; the dispatcher logs them (spec §13). */
export interface CronJobOutcome {
  readonly processed: number
  readonly created: number
  readonly skipped: number
}

/**
 * A background job run by `runCron`. Jobs must be idempotent, because a window can run again after a failure.
 * `isDue` lets hourly or daily jobs skip windows they do not own (decision D-26); without it the job runs every window.
 */
export interface CronJob {
  readonly name: string
  isDue?(window: CronWindow): boolean
  run(window: CronWindow): Promise<Result<CronJobOutcome>>
}

/** Stable ordering cursor persisted for capped scheduled jobs. */
export interface JobCursor {
  readonly updatedAt: number
  readonly id: string
}

/** A capped page and its continuation cursor. */
export interface JobBatch<T> {
  readonly rows: readonly T[]
  readonly nextCursor?: JobCursor
}

/** Persistent idempotency and continuation state for scheduled jobs. */
export interface JobRunStore {
  claim(job: string, window: string): Promise<boolean>
  getCursor?(job: string): Promise<JobCursor | undefined>
  saveCursor?(job: string, cursor: JobCursor | undefined): Promise<void>
}

/** A task or record that can receive a scheduled notification. */
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
