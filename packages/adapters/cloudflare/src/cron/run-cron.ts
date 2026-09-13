import { domainError, err, type Clock, type Logger, type Result } from '@ops/kernel'
import type { CronJob, CronJobOutcome, CronWindow } from './cron-job'

/** Interval of the single cron trigger per tenant Worker, every 15 minutes (decision D-26). */
export const CRON_INTERVAL_MS = 15 * 60 * 1000

/** Inputs of one dispatcher run. */
export interface CronRun {
  readonly scheduledTime: number
  readonly jobs: readonly CronJob[]
  readonly clock: Clock
  readonly logger: Logger
}

async function settle(job: CronJob, window: CronWindow): Promise<Result<CronJobOutcome>> {
  try {
    return await job.run(window)
  } catch {
    return err(domainError('INTERNAL', 'Job threw'))
  }
}

async function runJob(job: CronJob, window: CronWindow, run: CronRun): Promise<boolean> {
  const startedAt = run.clock.now()
  const result = await settle(job, window)
  const fields = { job: job.name, window, durationMs: run.clock.now() - startedAt }
  if (result.ok) {
    const { processed, created, skipped } = result.value
    run.logger.info('cron.job', { ...fields, processed, created, skipped })
    return true
  }
  run.logger.error('cron.job_failed', { ...fields, error: result.error.code })
  return false
}

/**
 * Runs each due job for the window ending at `scheduledTime`, one after another so jobs do not contend for the database.
 * A job that fails or throws is logged and does not stop the others; it runs again next window.
 * @returns the names of the jobs that completed, in registry order; never fails.
 */
export async function runCron(run: CronRun): Promise<{ readonly ran: string[] }> {
  const window: CronWindow = { start: run.scheduledTime - CRON_INTERVAL_MS, end: run.scheduledTime }
  const ran: string[] = []
  for (const job of run.jobs) {
    if (job.isDue?.(window) !== false && (await runJob(job, window, run))) ran.push(job.name)
  }
  return { ran }
}
