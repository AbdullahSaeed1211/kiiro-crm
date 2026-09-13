import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkDisables, disableFiles, gatedDisables, loadGatedRules, ruleNames } from '../../check-disables'
import { CLI_TIMEOUT, FIXTURES, runCheck } from './run-check'

const fixture = join(FIXTURES, 'disables')
// Built at runtime so this test file never carries a real directive.
const KEYWORD = ['eslint', 'disable'].join('-')
const GATED_FILE = 'packages/kernel/src/gated.ts'

describe('check:disables parsing', () => {
  it('loads every gated rule from tooling/eslint/rules.js', async () => {
    const gated = await loadGatedRules()
    expect(gated.has('complexity')).toBe(true)
    expect(gated.has('@typescript-eslint/no-non-null-assertion')).toBe(true)
    expect(gated.has('no-console')).toBe(false)
  })

  it('parses rule lists and drops descriptions', () => {
    expect(ruleNames(' complexity,  max-lines -- generated code')).toEqual(['complexity', 'max-lines'])
    expect(ruleNames(' ')).toEqual([])
  })

  it('finds line, block and multi-line directives naming gated rules', () => {
    const gated = new Set(['complexity', 'max-depth'])
    const lines = [`// ${KEYWORD}-next-line complexity`, 'x()', `/* ${KEYWORD} */`, `/* ${KEYWORD}`, '  max-depth */']
    expect(gatedDisables(lines.join('\n'), gated)).toEqual([
      { line: 1, rule: 'complexity' },
      { line: 4, rule: 'max-depth' },
    ])
  })
})

describe('check:disables scan', () => {
  it('skips planted fixtures nested under scripts/fixtures', () => {
    expect(disableFiles(fixture)).toEqual(['apps/site/src/allowed.ts', GATED_FILE])
  })

  it('reports each gated rule in the planted fixture', async () => {
    expect(checkDisables(fixture, await loadGatedRules())).toEqual([
      `${GATED_FILE}:1 complexity`,
      `${GATED_FILE}:3 max-lines`,
      `${GATED_FILE}:5 @typescript-eslint/no-explicit-any`,
    ])
  })

  it('exits 1 on the planted fixture', { timeout: CLI_TIMEOUT }, () => {
    const run = runCheck('check-disables.ts', ['--root', fixture])
    expect(run.code).toBe(1)
    expect(run.stderr).toContain(`${GATED_FILE}:1 complexity`)
  })
})
