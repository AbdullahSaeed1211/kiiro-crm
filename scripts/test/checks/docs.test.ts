import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkDocs, hasTsDoc, isExportedFunction } from '../../check-docs'
import { workspacePackages } from '../../lib/workspace'
import { CLI_TIMEOUT, FIXTURES, REPO_ROOT, runCheck } from './run-check'

const fixture = join(FIXTURES, 'docs')

describe('check:docs workspace discovery', () => {
  it('lists workspace directories that hold a package.json', () => {
    expect(workspacePackages(fixture)).toEqual([
      'apps/site',
      'packages/kernel',
      'packages/modules/crm',
      'packages/templates',
      'packages/ui',
    ])
    const repo = workspacePackages(REPO_ROOT)
    expect(repo).toContain('packages/modules/crm')
    expect(repo).not.toContain('packages/modules')
  })

  it('reads package globs from pnpm-workspace.yaml', () => {
    const root = mkdtempSync(join(tmpdir(), 'check-docs-'))
    mkdirSync(join(root, 'libs/one'), { recursive: true })
    writeFileSync(join(root, 'libs/one/package.json'), '{}')
    writeFileSync(join(root, 'pnpm-workspace.yaml'), "packages:\n  - 'libs/*'\nonlyBuiltDependencies:\n  - esbuild\n")
    expect(workspacePackages(root)).toEqual(['libs/one'])
  })
})

describe('check:docs TSDoc detection', () => {
  it('recognises exported function declarations and function-valued consts', () => {
    const lines = [
      'export function a() {',
      'export async function b() {',
      'export default function () {',
      'export const c = (x: number) => x',
      'export const d: Handler = async () => 1',
      'export const e = <T>(x: T) => x',
      'export const f = value => value',
      'export const g = 1',
      'function h() {',
    ]
    expect(lines.map(isExportedFunction)).toEqual([true, true, true, true, true, true, true, false, false])
  })

  it('recognises TSDoc blocks directly above a line', () => {
    const lines = ['/** One line. */', 'a', '/**', ' * Many.', ' */', 'b', '/* plain */', 'c', '// line', 'd', 'e']
    expect([1, 5, 7, 9, 10].map((index) => hasTsDoc(lines, index))).toEqual([true, true, false, false, false])
  })
})

describe('check:docs findings', () => {
  it('reports planted README and TSDoc gaps in packages/ and skips apps', () => {
    expect(checkDocs(fixture)).toEqual([
      'packages/kernel/README.md: missing "## Public API"',
      'packages/kernel/src/index.ts:6 exported function lacks TSDoc',
      'packages/kernel/src/index.ts:11 exported function lacks TSDoc',
      'packages/kernel/src/index.ts:14 exported function lacks TSDoc',
      'packages/modules/crm/README.md: missing "## Ports"',
      'packages/modules/crm/README.md: missing "## Invariants"',
      'packages/templates: missing README.md',
    ])
  })

  it('exits 1 on the planted fixture', { timeout: CLI_TIMEOUT }, () => {
    const run = runCheck('check-docs.ts', ['--root', fixture])
    expect(run.code).toBe(1)
    expect(run.stderr).toContain('packages/templates: missing README.md')
  })
})
