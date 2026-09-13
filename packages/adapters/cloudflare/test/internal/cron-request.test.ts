import { fixedClock, ok } from '@ops/kernel'
import { describe, expect, it } from 'vitest'
import { INTERNAL_ROUTES, INTERNAL_SECRET_HEADER } from '../../src/contracts/worker'
import type { CronJob, CronWindow } from '../../src/cron/cron-job'
import { handleCronRequest } from '../../src/internal/cron-request'

const SECRET = 'internal-test-secret'
const SCHEDULED = 1_700_000_000_000
const silent = { debug: () => undefined, info: () => undefined, warn: () => undefined, error: () => undefined }

function cronRequest(body: string, secret: string | null = SECRET): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (secret !== null) headers[INTERNAL_SECRET_HEADER] = secret
  return new Request(`https://tenant.example.test${INTERNAL_ROUTES.cron}`, { method: 'POST', body, headers })
}

function recordingJob() {
  const windows: CronWindow[] = []
  const job: CronJob = {
    name: 'recording',
    run: (window) => {
      windows.push(window)
      return Promise.resolve(ok({ processed: 0, created: 0, skipped: 0 }))
    },
  }
  return { job, windows }
}

const deps = (jobs: readonly CronJob[]) => ({ secret: SECRET, jobs, clock: fixedClock(SCHEDULED), logger: silent })
const validBody = JSON.stringify({ scheduledTime: SCHEDULED })

describe('handleCronRequest', () => {
  it('runs the registered jobs for the scheduled time and responds with their names', async () => {
    const { job, windows } = recordingJob()
    const response = await handleCronRequest(cronRequest(validBody), deps([job]))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ran: ['recording'] })
    expect(windows.map((window) => window.end)).toEqual([SCHEDULED])
  })

  it('responds with an empty list when no job is registered', async () => {
    const response = await handleCronRequest(cronRequest(validBody), deps([]))
    expect(await response.json()).toEqual({ ran: [] })
  })

  it.each([
    ['missing', null],
    ['wrong', 'internal-test-secreT'],
  ])('refuses a %s secret with 401 without running jobs', async (_label, secret) => {
    const { job, windows } = recordingJob()
    const response = await handleCronRequest(cronRequest(validBody, secret), deps([job]))
    expect(response.status).toBe(401)
    expect(windows).toEqual([])
  })

  it('refuses every request when the tenant secret is unset', async () => {
    const response = await handleCronRequest(cronRequest(validBody), { ...deps([]), secret: undefined })
    expect(response.status).toBe(401)
  })

  it.each(['not json', '{}', '{"scheduledTime":"soon"}', '{"scheduledTime":-1}', '{"scheduledTime":1.5}', 'null'])(
    'rejects body %s with 400 VALIDATION',
    async (body) => {
      const response = await handleCronRequest(cronRequest(body), deps([]))
      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION' } })
    },
  )
})
