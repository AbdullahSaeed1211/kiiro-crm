import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { CONFLICT_CASES } from './conflict'
import { CRON_CASES, INBOUND_CASES } from './duplicates'
import { startLocalStack, type LocalStack, type SpikeCase } from './local-stack'
import { SCOPE_CASES } from './scope'

// A fresh local D1 file is migrated and seeded first; Wrangler's first local start can take a while.
const STARTUP_TIMEOUT_MS = 180_000
const CASE_TIMEOUT_MS = 30_000

let started: LocalStack | undefined

function stack(): LocalStack {
  if (started === undefined) throw new Error('the local stack did not start')
  return started
}

beforeAll(async () => {
  started = await startLocalStack()
}, STARTUP_TIMEOUT_MS)

afterAll(async () => {
  await started?.dispose()
})

// Groups share one Payload instance and one D1 file and run in order: scope checks need the rows exactly as seeded.
const GROUPS: readonly (readonly [string, readonly SpikeCase[]])[] = [
  ['spike: staff scope on local D1', SCOPE_CASES],
  ['spike: stale-version conflicts on local D1', CONFLICT_CASES],
  ['spike: duplicate cron runs on local D1', CRON_CASES],
  ['spike: duplicate inbound email on local D1', INBOUND_CASES],
]

for (const [name, cases] of GROUPS) {
  describe(name, { timeout: CASE_TIMEOUT_MS }, () => {
    for (const [title, run] of cases) {
      it(title, async () => {
        await expect(run(stack())).resolves.toBeUndefined()
      })
    }
  })
}
