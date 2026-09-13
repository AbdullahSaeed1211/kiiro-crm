import { describe, expect, it } from 'vitest'
import {
  acceptanceCommands,
  failingLines,
  parseScopeViolations,
  scriptName,
  suggestClasses,
  unavailableReason,
  verifyFastGates,
} from '../../harness/lib/gates.ts'
import { fakeRunner, makeRepo } from './helpers.ts'
import { createShellRunner, stripAnsi } from '../../harness/lib/exec.ts'
import { REAL_ROOT } from './helpers.ts'

const MAP = {
  'check:scope': 'SCOPE_VIOLATION',
  lint: 'GATE_FAILURE',
  test: 'MISSING_TEST',
  'test:permissions': 'AUTHZ_GAP',
}

describe('command helpers', () => {
  it.each([
    ['pnpm lint', 'lint'],
    ['pnpm --filter web build', 'build'],
    ['pnpm --filter web exec wrangler types', 'wrangler'],
    ['pnpm vitest run scripts/test/harness', 'test'],
    ['vitest run --changed', 'test'],
    ['pnpm test:e2e --grep spike', 'test:e2e'],
  ])('scriptName(%s) = %s', (command, expected) => {
    expect(scriptName(command)).toBe(expected)
  })

  it('keeps only runnable, terminating acceptance commands', () => {
    const cell = '`pnpm build` succeeds; `/tasks` renders on `pnpm dev`; `pnpm --filter web dev`; `CONFLICT`'
    expect(acceptanceCommands(cell)).toEqual(['pnpm build'])
  })

  it('splits verify:fast and falls back to the script when it is not defined', () => {
    const steps = verifyFastGates({ 'verify:fast': 'pnpm lint && vitest run --changed && pnpm check:scope' })
    expect(steps).toEqual([
      { name: 'lint', command: 'pnpm lint' },
      { name: 'vitest run --changed', command: 'vitest run --changed' },
    ])
    expect(verifyFastGates({})).toEqual([{ name: 'verify:fast', command: 'pnpm verify:fast' }])
  })

  it('explains unavailable scripts', () => {
    const root = makeRepo()
    const scripts = { 'check:scope': 'tsx scripts/check-scope.ts', lint: 'eslint .' }
    expect(unavailableReason({ root, command: 'pnpm check:scope M0-W3', scripts })).toMatch(/does not exist/)
    expect(unavailableReason({ root, command: 'pnpm check:missing', scripts })).toMatch(/not defined/)
    expect(unavailableReason({ root, command: 'pnpm lint', scripts })).toBeUndefined()
  })
})

describe('output helpers', () => {
  it('keeps at most 20 failure-looking lines, else the output tail', () => {
    const noisy = Array.from({ length: 30 }, (_v, i) => `error ${String(i)}`).join('\n')
    expect(failingLines(noisy)).toHaveLength(20)
    expect(failingLines('a\nb\nc')).toEqual(['a', 'b', 'c'])
    expect(stripAnsi(`${String.fromCharCode(27)}[31mred${String.fromCharCode(27)}[0m`)).toBe('red')
  })

  it('parses scope violations and suggests classes', () => {
    expect(parseScopeViolations('ok\nFAIL: package.json\nFLAG docs/notes.md\nFAIL 2 files')).toEqual([
      'package.json',
      'docs/notes.md',
    ])
    const gates = [
      { name: 'lint', exitCode: 1, durationMs: 1, failingLines: [] },
      { name: 'pnpm vitest run x', exitCode: 1, durationMs: 1, failingLines: ['FAIL can denies permission'] },
      { name: 'check:scope', exitCode: 127, durationMs: 0, failingLines: ['unavailable: missing'] },
    ]
    expect(suggestClasses({ gates, scopeViolations: ['a/b'], gateClassMap: MAP })).toEqual([
      'GATE_FAILURE',
      'AUTHZ_GAP',
      'SCOPE_VIOLATION',
    ])
  })
})

describe('runners', () => {
  it('fake runner records calls', async () => {
    const { run, calls } = fakeRunner()
    await run({ command: 'x', cwd: '.' })
    expect(calls).toEqual(['x'])
  })

  it('shell runner captures exit code and output', async () => {
    const run = createShellRunner({ root: REAL_ROOT })
    const result = await run({ command: 'echo hello && echo oops >&2 && exit 3', cwd: REAL_ROOT })
    expect(result.exitCode).toBe(3)
    expect(result.output).toContain('hello')
    expect(result.output).toContain('oops')
  })
})
