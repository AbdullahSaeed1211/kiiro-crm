import { existsSync, readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { planGates, recordAttempt } from '../../harness/record.ts'
import { UNAVAILABLE_EXIT } from '../../harness/lib/attempts.ts'
import { loadSchema, validate } from '../../harness/lib/schema.ts'
import { cleanupRepos, fakeRunner, makeRepo, writeFile } from './helpers.ts'

afterEach(cleanupRepos)

const ACCEPTANCE = 'pnpm vitest run packages/platform/test/permissions'
const FIXED_NOW = (): Date => new Date('2026-09-13T12:00:00.000Z')

describe('planGates', () => {
  it('runs runnable acceptance commands, verify:fast steps and check:scope with the base', () => {
    const root = makeRepo()
    const gates = planGates({ root, wp: 'M5-W1', base: 'm5-ui' })
    expect(gates.map((g) => g.name)).toEqual([
      ACCEPTANCE,
      'format:check',
      'typecheck',
      'vitest run --changed',
      'check:scope',
    ])
    expect(gates.at(-1)?.command).toBe('pnpm check:scope M5-W1 --base m5-ui')
  })
})

describe('recordAttempt gates', () => {
  it('records check:scope as unavailable (127) when its script is missing, without running it', async () => {
    const root = makeRepo()
    const { run, calls } = fakeRunner()
    const result = await recordAttempt({ root, wp: 'M5-W1', attempt: 1, runner: 'worker', run, base: 'm5-ui' })
    const scope = result.data.gates.find((g) => g.name === 'check:scope')
    expect(scope?.exitCode).toBe(UNAVAILABLE_EXIT)
    expect(scope?.failingLines[0]).toMatch(/^unavailable: `pnpm check:scope M5-W1 --base m5-ui`.*check-scope\.ts/)
    expect(calls.some((c) => c.includes('check:scope'))).toBe(false)
    expect(result.failed).toEqual([])
    expect(result.data.suggestedClasses).toEqual([])
    expect(result.file.endsWith('harness/metrics/attempts/M5-W1-a1.json')).toBe(true)
  })
})

describe('recordAttempt classification', () => {
  it('classifies failing gates and scope output, and writes a schema-valid file', async () => {
    const root = makeRepo({ 'scripts/check-scope.ts': '' })
    const { run } = fakeRunner(({ command }) => {
      if (command === ACCEPTANCE) return { exitCode: 1, output: 'ok 1\n FAIL permissions.test.ts > denies\nnoise' }
      if (command.startsWith('pnpm check:scope')) return { exitCode: 1, output: 'FAIL tenants/a.jsonc\nFLAG docs/x.md' }
      if (command.startsWith('git merge-base')) return { output: 'abc123\n' }
      if (command.startsWith('git diff')) return { output: 'a.ts\nb.ts\n' }
      if (command.startsWith('git ls-files')) return { output: 'b.ts\nc.ts\n' }
      return {}
    })
    const result = await recordAttempt({
      root,
      wp: 'M5-W1',
      attempt: 2,
      runner: 'lead',
      run,
      base: 'm5-ui',
      confirmed: ['CONTRACT_DRIFT', 'CONTRACT_DRIFT'],
      now: FIXED_NOW,
    })
    expect(result.data.suggestedClasses).toEqual(['AUTHZ_GAP', 'SCOPE_VIOLATION'])
    expect(result.data.confirmedClasses).toEqual(['CONTRACT_DRIFT'])
    expect(result.data.scopeViolations).toEqual(['tenants/a.jsonc', 'docs/x.md'])
    expect(result.data.filesChanged).toBe(3)
    expect(result.data.gates[0]?.failingLines).toEqual(['FAIL permissions.test.ts > denies'])
    expect(result.file.endsWith('M5-W1-a2-lead.json')).toBe(true)
    const written: unknown = JSON.parse(readFileSync(result.file, 'utf8'))
    expect(validate(loadSchema(root, 'attempt'), written)).toEqual([])
  })
})

describe('recordAttempt files and base', () => {
  it('never overwrites an existing attempt file and keeps runner files apart', async () => {
    const root = makeRepo()
    const { run } = fakeRunner()
    writeFile(root, 'harness/metrics/attempts/M5-W1-a1.json', '{"keep":true}')
    await expect(recordAttempt({ root, wp: 'M5-W1', attempt: 1, runner: 'worker', run, base: 'b' })).rejects.toThrow(
      /never overwritten/,
    )
    expect(readFileSync(`${root}/harness/metrics/attempts/M5-W1-a1.json`, 'utf8')).toBe('{"keep":true}')
    await recordAttempt({ root, wp: 'M5-W1', attempt: 1, runner: 'lead', run, base: 'b' })
    expect(existsSync(`${root}/harness/metrics/attempts/M5-W1-a1-lead.json`)).toBe(true)
  })

  it('detects the milestone branch when no base is given and tolerates git failures', async () => {
    const root = makeRepo()
    const { run, calls } = fakeRunner(({ command }) =>
      command.startsWith('git branch') ? { output: 'm5-ui\n' } : { exitCode: command.startsWith('git') ? 128 : 0 },
    )
    const result = await recordAttempt({ root, wp: 'M5-W2', attempt: 1, runner: 'worker', run })
    expect(calls).toContain('git merge-base m5-ui HEAD')
    expect(result.data.filesChanged).toBe(0)
    expect(result.data.gates.map((g) => g.name)).toContain('pnpm lint')
  })
})
