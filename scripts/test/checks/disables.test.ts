import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ALL_RULES, checkDisables, disableFiles, gatedDisables, loadGatedRules, ruleNames } from '../../check-disables'
import { FIXTURES } from './run-check'

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
      { line: 3, rule: ALL_RULES },
      { line: 4, rule: 'max-depth' },
    ])
  })

  it('accepts a gated directive with an explicit inline reason', () => {
    const gated = new Set(['complexity'])
    expect(gatedDisables('// eslint-disable-next-line complexity -- bounded parser state machine', gated)).toEqual([])
  })

  it('reports a directive that names no rule, even with a reason', () => {
    expect(gatedDisables(`/* ${KEYWORD} -- legacy file */`, new Set())).toEqual([{ line: 1, rule: ALL_RULES }])
  })
})

describe('check:disables scan', () => {
  it('skips planted fixtures nested under scripts/fixtures', () => {
    expect(disableFiles(fixture)).toEqual(['apps/site/src/allowed.ts', GATED_FILE])
  })

  it('reports each gated rule and each blanket directive in the planted fixture', async () => {
    expect(checkDisables(fixture, await loadGatedRules())).toEqual([
      `apps/site/src/allowed.ts:3 ${ALL_RULES}`,
      `${GATED_FILE}:1 complexity`,
      `${GATED_FILE}:3 max-lines`,
      `${GATED_FILE}:5 @typescript-eslint/no-explicit-any`,
    ])
  })
})
