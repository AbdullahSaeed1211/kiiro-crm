import { createJsonLogger, domainError, systemClock, type Clock, type Logger } from '@ops/kernel'
import type { CronJob } from '../cron/cron-job'
import { runCron } from '../cron/run-cron'
import { rejectUnauthorized } from './internal-secret'
import { domainErrorResponse } from './responses'

/** What the internal cron route passes from its composition root. */
export interface CronRequestDeps {
  /** The tenant's `INTERNAL_SECRET`; unset means every request is refused. */
  readonly secret: string | undefined
  /** Job registry; jobs run in this order. */
  readonly jobs: readonly CronJob[]
  readonly clock?: Clock
  readonly logger?: Logger
}

function scheduledTimeOf(body: unknown): number | undefined {
  if (typeof body !== 'object' || body === null || !('scheduledTime' in body)) return undefined
  const { scheduledTime } = body
  return typeof scheduledTime === 'number' && Number.isSafeInteger(scheduledTime) && scheduledTime >= 0
    ? scheduledTime
    : undefined
}

/**
 * Handles `POST /api/v1/internal/cron` (spec §12, §13): authenticates, runs the registered jobs for the trigger's
 * scheduled time and reports the jobs that completed.
 * @returns 200 `{ ran }`; 401 `UNAUTHORIZED` on a missing or wrong internal secret;
 *   400 `VALIDATION` when the body is not `{ scheduledTime: number }` with a non-negative integer.
 */
export async function handleCronRequest(request: Request, deps: CronRequestDeps): Promise<Response> {
  const unauthorized = await rejectUnauthorized(request, deps.secret)
  if (unauthorized !== undefined) return unauthorized
  const body: unknown = await request.json().catch(() => undefined)
  const scheduledTime = scheduledTimeOf(body)
  if (scheduledTime === undefined) {
    return domainErrorResponse(domainError('VALIDATION', 'Body must be { scheduledTime: number }'))
  }
  const clock = deps.clock ?? systemClock
  const logger = deps.logger ?? createJsonLogger()
  const { ran } = await runCron({ scheduledTime, jobs: deps.jobs, clock, logger })
  return Response.json({ ran })
}
