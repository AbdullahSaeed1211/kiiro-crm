import { afterEach, describe, expect, it } from 'vitest'
import { evalTargets, runEvals, stepMismatch } from '../../harness/evals.ts'
import { createShellRunner } from '../../harness/lib/exec.ts'
import { cleanupRepos, fakeRunner, makeRepo, writeFile } from './helpers.ts'

afterEach(cleanupRepos)

const ID = 'L-20260913-M5-W1-a1b2c3'

function lesson(status: string): string {
  return [
    '---',
    `id: ${ID}`,
    'milestone: M5',
    'class: AUTHZ_GAP',
    'severity: severe',
    `status: ${status}`,
    "affectedPaths: ['packages/platform/**']",
    'countermeasure:',
    '  type: test',
    '  location: packages/platform/test/x.test.ts',
    `eval: ${ID}`,
    'sourceAttempts: [M5-W1-a1]',
    '---',
    '# Lesson',
    '',
  ].join('\n')
}

function repoWithEval(fixedCommand: string): string {
  const dir = `harness/evals/${ID}`
  const step = (cwd: string, command: string, expectExitCode: string): Record<string, string> => ({
    cwd: `${dir}/${cwd}`,
    command,
    expectExitCode,
  })
  return makeRepo({
    [`harness/lessons/${ID}.md`]: lesson('active'),
    [`${dir}/eval.json`]: JSON.stringify({
      lesson: ID,
      repro: step('repro', 'exit 1', 'nonzero'),
      fixed: step('fixed', fixedCommand, 'zero'),
    }),
    [`${dir}/repro/README.md`]: 'repro',
    [`${dir}/fixed/README.md`]: 'fixed',
  })
}

describe('runEvals', () => {
  it('fails when a fixed step exits nonzero', async () => {
    const root = repoWithEval('run-fixed')
    const lines: string[] = []
    const { run } = fakeRunner(({ command }) => ({ exitCode: command === 'run-fixed' ? 2 : 1 }))
    expect(await runEvals({ root, run, log: (line) => lines.push(line) })).toBe(1)
    expect(lines).toContain(`PASS ${ID} repro`)
    expect(lines).toContain(`FAIL ${ID} fixed: exit 2, expected zero`)
  })

  it('passes when repro fails and fixed passes (real shell)', async () => {
    const root = repoWithEval('exit 0')
    const lines: string[] = []
    expect(await runEvals({ root, run: createShellRunner({ root }), log: (line) => lines.push(line) })).toBe(0)
    expect(lines.at(-1)).toBe('1 eval target(s), 0 failure(s)')
  })

  it('fails when repro unexpectedly passes or the manifest is missing', async () => {
    const root = repoWithEval('exit 0')
    const { run } = fakeRunner()
    expect(await runEvals({ root, run, log: () => undefined })).toBe(1)
    const missing = makeRepo({ [`harness/lessons/${ID}.md`]: lesson('active') })
    const lines: string[] = []
    expect(await runEvals({ root: missing, run, log: (line) => lines.push(line) })).toBe(1)
    expect(lines.join('\n')).toMatch(/missing harness\/evals\/.*eval\.json/)
  })

  it('skips retired lessons and includes self-test manifests', () => {
    const step = { cwd: '.', command: 'true', expectExitCode: 'zero' }
    const root = makeRepo({
      [`harness/lessons/${ID}.md`]: lesson('retired'),
      'harness/selftest/loop/eval.json': JSON.stringify({ lesson: 'selftest', repro: step, fixed: step }),
    })
    expect(evalTargets(root).targets.map((t) => t.label)).toEqual(['selftest/loop/eval.json'])
  })
})

describe('stepMismatch', () => {
  const step = { cwd: '.', command: 'x', expectExitCode: 'nonzero' as const, expectOutput: 'denied' }

  it('checks exit codes, expected output and that fixed expects zero', () => {
    expect(
      stepMismatch({ role: 'repro', step, result: { exitCode: 1, output: 'access denied', durationMs: 1 } }),
    ).toBeUndefined()
    expect(stepMismatch({ role: 'repro', step, result: { exitCode: 1, output: 'boom', durationMs: 1 } })).toMatch(
      /output/,
    )
    expect(stepMismatch({ role: 'fixed', step, result: { exitCode: 0, output: '', durationMs: 1 } })).toMatch(
      /must expect/,
    )
  })
})

describe('empty harness', () => {
  it('passes with nothing to run', async () => {
    const root = makeRepo()
    writeFile(root, 'harness/lessons/README.md', '# Lessons')
    expect(await runEvals({ root, run: fakeRunner().run, log: () => undefined })).toBe(0)
  })
})
