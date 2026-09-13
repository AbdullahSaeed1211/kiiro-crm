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

// Known product gap (D-36, E-017): update-by-where is not a single conditional write, so both racers succeed.
// `it.fails` keeps the suite green and turns red once M1-W10 closes the gap.
const KNOWN_FAILURES: ReadonlySet<string> = new Set([
  'two concurrent saveDates with the same expectedUpdatedAt: exactly one succeeds',
])

for (const [name, cases] of GROUPS) {
  describe(name, { timeout: CASE_TIMEOUT_MS }, () => {
    for (const [title, run] of cases) {
      const test = KNOWN_FAILURES.has(title) ? it.fails : it
      test(title, async () => {
        await expect(run(stack())).resolves.toBeUndefined()
      })
    }
  })
}
