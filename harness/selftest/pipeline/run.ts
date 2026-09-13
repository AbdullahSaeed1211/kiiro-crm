/**
 * Harness self-test (spec §26.9): proves failure → classification → lesson → countermeasure → eval → brief injection
 * on a throwaway fixture root. `--break` simulates a harness regression (permission failures no longer classified),
 * so the pipeline must report SELFTEST FAILED.
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { REPO_ROOT } from '../../../scripts/harness/lib/repo.ts'
import { loadConfig } from '../../../scripts/harness/lib/config.ts'
import { suggestClasses } from '../../../scripts/harness/lib/gates.ts'
import { assertValid } from '../../../scripts/harness/lib/schema.ts'
import { loadLessons } from '../../../scripts/harness/lib/lessons.ts'
import { createShellRunner } from '../../../scripts/harness/lib/exec.ts'
import { runRetro } from '../../../scripts/harness/retro.ts'
import { runEvals } from '../../../scripts/harness/evals.ts'
import { renderBrief } from '../../../scripts/harness/brief.ts'

const breakMode = process.argv.includes('--break')

const PLAN = `# M0 plan

| WP | Owner | Wave | Depends | Status | Objective | Write scope | Acceptance |
|---|---|---|---|---|---|---|---|
| M0-X1 | Worker | 1 | — | merged | Fixture: permission-scoped record list | \`apps/fixture/src/records/\` | \`pnpm vitest run apps/fixture\` |
| M0-X2 | Worker | 2 | M0-X1 | planned | Fixture: record detail page | \`apps/fixture/src/records/detail/\` | \`pnpm vitest run apps/fixture\` |
`

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'harness-selftest-'))
  for (const dir of ['schemas', 'templates'])
    cpSync(join(REPO_ROOT, 'harness', dir), join(root, 'harness', dir), { recursive: true })
  cpSync(join(REPO_ROOT, 'harness', 'config.yaml'), join(root, 'harness', 'config.yaml'))
  mkdirSync(join(root, 'docs', 'orchestration', 'm0'), { recursive: true })
  writeFileSync(join(root, 'docs', 'orchestration', 'm0', 'plan.md'), PLAN)
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'fixture', private: true, scripts: {} }))
  return root
}

function recordFailingAttempt(root: string): string[] {
  const config = loadConfig(root)
  const gateClassMap = breakMode ? { ...config.gateClassMap, 'test:permissions': 'MISSING_TEST' } : config.gateClassMap
  const gates = [
    {
      name: 'test',
      exitCode: 1,
      durationMs: 1200,
      failingLines: ['FAIL permission scope: staff can read another team lead'],
    },
  ]
  const scopeViolations = ['package.json']
  const classes = suggestClasses({ gates, scopeViolations, gateClassMap })
  const attempt = {
    wp: 'M0-X1',
    milestone: 'M0',
    attempt: 1,
    runner: 'lead',
    startedAt: '2026-09-13T10:00:00.000Z',
    finishedAt: '2026-09-13T10:05:00.000Z',
    gates,
    scopeViolations,
    filesChanged: 4,
    suggestedClasses: classes,
    confirmedClasses: classes,
    leadTookOver: false,
  }
  assertValid({ root, name: 'attempt', label: 'selftest attempt' }, attempt)
  const dir = join(root, 'harness', 'metrics', 'attempts')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'M0-X1-a1-lead.json'), `${JSON.stringify(attempt, null, 2)}\n`)
  return classes
}

function completeLesson(root: string, lessonId: string): void {
  const lessonFile = join(root, 'harness', 'lessons', `${lessonId}.md`)
  writeFileSync(
    lessonFile,
    readFileSync(lessonFile, 'utf8').replace('location: TODO', 'location: apps/fixture/test/permissions.test.ts'),
  )
  const evalDir = join(root, 'harness', 'evals', lessonId)
  writeFileSync(
    join(evalDir, 'repro', 'check.mjs'),
    "const canRead = (actor, record) => true\nprocess.exit(canRead({ team: 'a' }, { team: 'b' }) ? 1 : 0)\n",
  )
  writeFileSync(
    join(evalDir, 'fixed', 'check.mjs'),
    "const canRead = (actor, record) => actor.team === record.team\nprocess.exit(canRead({ team: 'a' }, { team: 'b' }) ? 1 : 0)\n",
  )
  const manifest = {
    lesson: lessonId,
    repro: { cwd: `harness/evals/${lessonId}/repro`, command: 'node check.mjs', expectExitCode: 'nonzero' },
    fixed: { cwd: `harness/evals/${lessonId}/fixed`, command: 'node check.mjs', expectExitCode: 'zero' },
  }
  writeFileSync(join(evalDir, 'eval.json'), `${JSON.stringify(manifest, null, 2)}\n`)
}

async function main(): Promise<string[]> {
  const root = makeRoot()
  const problems: string[] = []
  try {
    const classes = recordFailingAttempt(root)
    if (!classes.includes('AUTHZ_GAP'))
      problems.push(`classification: expected AUTHZ_GAP, got ${classes.join(', ') || 'none'}`)
    if (!classes.includes('SCOPE_VIOLATION')) problems.push('classification: expected SCOPE_VIOLATION')
    const retro = runRetro({ root, n: 0, dryRun: false, date: new Date('2026-09-13T12:00:00Z') }).join('\n')
    if (/SCOPE_VIOLATION \(ordinary.*scaffolded/.test(retro))
      problems.push('promotion: a single ordinary class must not promote')
    const lessonsDir = join(root, 'harness', 'lessons')
    const lessonIds = existsSync(lessonsDir) ? readdirSync(lessonsDir).map((f) => f.replace(/\.md$/, '')) : []
    const authz = lessonIds.find((id) => loadLessons(root).lessons.some((l) => l.id === id && l.class === 'AUTHZ_GAP'))
    if (authz === undefined) {
      problems.push('promotion: severe AUTHZ_GAP was not promoted on first occurrence')
      return problems
    }
    completeLesson(root, authz)
    const logs: string[] = []
    const evalCode = await runEvals({ root, run: createShellRunner({ root }), log: (line) => logs.push(line) })
    if (evalCode !== 0) problems.push(`evals: ${logs.join(' | ')}`)
    const brief = renderBrief({
      root,
      wp: 'M0-X2',
      attempt: 1,
      milestoneBranch: 'm0-selftest',
      lessons: loadLessons(root).lessons,
    })
    if (!brief.includes(authz))
      problems.push('injection: overlapping WP brief does not list the lesson under Known pitfalls')
    return problems
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

const problems = await main()
if (problems.length > 0) {
  console.log(`SELFTEST FAILED\n${problems.map((p) => `- ${p}`).join('\n')}`)
  process.exitCode = 1
} else {
  console.log(
    'SELFTEST PASSED: classification, severe promotion, lesson eval (repro fails, fixed passes) and brief injection',
  )
}
