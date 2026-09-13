import { createJsonLogger, domainError, err, fixedClock, ok } from '@ops/kernel'
import { describe, expect, it } from 'vitest'
import type { CronJob } from '../../src/cron/cron-job'
import { CRON_INTERVAL_MS, runCron } from '../../src/cron/run-cron'

const SCHEDULED = Date.UTC(2026, 8, 13, 12, 0)
const EMPTY = { processed: 0, created: 0, skipped: 0 }

function capturingLogger() {
  const lines: Record<string, unknown>[] = []
  const logger = createJsonLogger((line) => {
    lines.push(JSON.parse(line) as Record<string, unknown>)
  })
  return { lines, logger }
}

function job(name: string, run: CronJob['run'], isDue?: CronJob['isDue']): CronJob {
  return { name, run, ...(isDue === undefined ? {} : { isDue }) }
}

describe('runCron', () => {
  it('runs every job for the window and logs its counts', async () => {
    const { lines, logger } = capturingLogger()
    const jobs = [
      job('first', () => Promise.resolve(ok({ processed: 2, created: 1, skipped: 1 }))),
      job('second', () => Promise.resolve(ok(EMPTY))),
    ]
    const result = await runCron({ scheduledTime: SCHEDULED, jobs, clock: fixedClock(SCHEDULED), logger })
    expect(result).toEqual({ ran: ['first', 'second'] })
    expect(lines[0]).toEqual({
      level: 'info',
      msg: 'cron.job',
      job: 'first',
      window: { start: SCHEDULED - CRON_INTERVAL_MS, end: SCHEDULED },
      processed: 2,
      created: 1,
      skipped: 1,
      durationMs: 0,
    })
  })
})

describe('runCron failures and due checks', () => {
  it('keeps running later jobs when one throws or fails', async () => {
    const { lines, logger } = capturingLogger()
    const jobs = [
      job('throws', () => Promise.reject(new Error('boom'))),
      job('fails', () => Promise.resolve(err(domainError('UNAVAILABLE', 'store down')))),
      job('works', () => Promise.resolve(ok(EMPTY))),
    ]
    const result = await runCron({ scheduledTime: SCHEDULED, jobs, clock: fixedClock(SCHEDULED), logger })
    expect(result).toEqual({ ran: ['works'] })
    const failures = lines.filter((line) => line['msg'] === 'cron.job_failed')
    expect(failures.map((line) => [line['job'], line['error']])).toEqual([
      ['throws', 'INTERNAL'],
      ['fails', 'UNAVAILABLE'],
    ])
  })

  it('skips jobs that are not due in the window', async () => {
    const { logger } = capturingLogger()
    const seen: number[] = []
    const jobs = [
      job(
        'hourly',
        () => Promise.resolve(ok(EMPTY)),
        () => false,
      ),
      job('always', (window) => {
        seen.push(window.end)
        return Promise.resolve(ok(EMPTY))
      }),
    ]
    const result = await runCron({ scheduledTime: SCHEDULED, jobs, clock: fixedClock(SCHEDULED), logger })
    expect(result).toEqual({ ran: ['always'] })
    expect(seen).toEqual([SCHEDULED])
  })
})
