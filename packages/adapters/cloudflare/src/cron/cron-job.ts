import type { Result } from '@ops/kernel'

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
