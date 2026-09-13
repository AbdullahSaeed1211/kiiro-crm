import { execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { changedPaths, classifyPaths, findPlanRow, matchesPattern, milestoneOf } from '../../check-scope'
import { CLI_TIMEOUT, FIXTURES, REPO_ROOT, runCheck } from './run-check'

const fixture = join(FIXTURES, 'scope')
const WP = 'M0-W1'
const CHECK_GLOB = 'scripts/check-*.ts'
const MANIFEST = 'package.json'

describe('check:scope plan parsing', () => {
  it('reads the owner and write scope of a plan row', () => {
    const plan = readFileSync(join(fixture, 'docs/orchestration/m0/plan.md'), 'utf8')
    expect(findPlanRow(plan, WP)).toEqual({ owner: 'Worker', scope: [CHECK_GLOB, 'scripts/test/checks/'] })
    expect(findPlanRow(plan, 'M0-W9')).toBeNull()
    expect(milestoneOf('M12-L3')).toBe('12')
    expect(milestoneOf('W1')).toBeNull()
  })

  it('reads the real M0 plan table', () => {
    const real = readFileSync(join(REPO_ROOT, 'docs/orchestration/m0/plan.md'), 'utf8')
    expect(findPlanRow(real, WP)?.scope).toContain('scripts/fixtures/checks/')
  })
})

describe('check:scope path classification', () => {
  it('matches directories, globs and exact paths', () => {
    const cases: [string, string][] = [
      ['tooling/eslint/rules.js', 'tooling/'],
      ['scripts/check-brand.ts', CHECK_GLOB],
      ['scripts/lib/check-x.ts', CHECK_GLOB],
      ['a/c.ts', 'a/**/*.ts'],
      ['a/b/c.ts', 'a/**/*.ts'],
      ['package.json.bak', MANIFEST],
    ]
    expect(cases.map(([path, pattern]) => matchesPattern(path, pattern))).toEqual([
      true,
      true,
      false,
      true,
      true,
      false,
    ])
  })

  it('fails critical paths for workers, flags out-of-scope paths and allows attempts and the report', () => {
    const allowed = ['harness/metrics/attempts/M0-W1-a2.json', 'docs/orchestration/m0/reports/M0-W1.md']
    const outside = ['scripts/lib/files.ts', 'docs/orchestration/m0/reports/M0-W2.md']
    const paths = ['scripts/check-brand.ts', MANIFEST, ...allowed, ...outside]
    const worker = { owner: 'Worker', scope: [CHECK_GLOB] }
    expect(classifyPaths(paths, WP, worker)).toEqual({ failures: [MANIFEST], flags: outside })
  })

  it('lets lead WPs touch critical paths', () => {
    const lead = { owner: 'Lead', scope: [MANIFEST] }
    expect(classifyPaths([MANIFEST, 'tooling/x.js'], 'M0-L1', lead)).toEqual({ failures: [], flags: ['tooling/x.js'] })
  })
})

describe('check:scope git diff', () => {
  it('lists paths changed on HEAD since the base branch', { timeout: CLI_TIMEOUT }, () => {
    const root = mkdtempSync(join(tmpdir(), 'check-scope-'))
    const identity = ['-c', 'user.name=check', '-c', 'user.email=check@example.com', '-c', 'commit.gpgsign=false']
    const git = (...args: string[]): string =>
      // eslint-disable-next-line sonarjs/no-os-command-from-path -- tests drive the git found on PATH, as developers and CI do
      execFileSync('git', [...identity, ...args], { cwd: root, encoding: 'utf8' })
    cpSync(join(fixture, 'docs'), join(root, 'docs'), { recursive: true })
    git('init', '-q', '-b', 'base')
    git('add', '.')
    git('commit', '-qm', 'base')
    git('checkout', '-qb', 'wp')
    writeFileSync(join(root, MANIFEST), '{}\n')
    git('add', '.')
    git('commit', '-qm', 'wp')
    expect(changedPaths(root, 'base')).toEqual([MANIFEST])
  })
})

describe('check:scope CLI', () => {
  const run = (wp: string, list: string) =>
    runCheck('check-scope.ts', [wp, '--root', fixture, '--files', join(fixture, list)])

  it('exits 1 when the planted change list touches a critical path', { timeout: CLI_TIMEOUT }, () => {
    const result = run(WP, 'critical.txt')
    expect(result.code).toBe(1)
    expect(result.stderr).toContain('FAIL package.json')
    expect(result.stderr).toContain('FAIL tooling/eslint/rules.js')
  })

  it('exits 0 and prints FLAG lines for out-of-scope paths', { timeout: CLI_TIMEOUT }, () => {
    const result = run(WP, 'flagged.txt')
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('FLAG scripts/lib/files.ts')
    expect(result.stdout.split('\n').filter((line) => line.startsWith('FLAG'))).toHaveLength(1)
  })

  it('exits 1 for an unknown WP', { timeout: CLI_TIMEOUT }, () => {
    const result = run('M0-W9', 'flagged.txt')
    expect(result.code).toBe(1)
    expect(result.stderr).toContain('no plan row for "M0-W9"')
  })
})
