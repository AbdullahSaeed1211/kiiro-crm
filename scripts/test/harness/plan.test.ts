import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { buildPlan, changesSection, mergePlan, withStatusColumn } from '../../harness/plan.ts'
import { extractSpecTable } from '../../harness/lib/plan-rows.ts'
import { paths, readText } from '../../harness/lib/repo.ts'
import { parseTableDocument, splitRow } from '../../harness/lib/table.ts'
import { cleanupRepos, makeRepo, REAL_ROOT } from './helpers.ts'

afterEach(cleanupRepos)

const realSpec = (): string => readText(paths.spec(REAL_ROOT))

describe('spec table extraction', () => {
  it('extracts the M1 table from the real spec', () => {
    const table = extractSpecTable(realSpec(), 1)
    expect(table.headers).toEqual(['WP', 'Owner', 'Wave', 'Depends', 'Objective', 'Write scope', 'Acceptance'])
    expect(table.rows.map((row) => row[0])).toContain('M1-W7')
  })

  it('fails for a heading without a table', () => {
    expect(() => extractSpecTable(realSpec(), 42)).toThrow(/no "#### M42 work packages"/)
    expect(() => extractSpecTable('#### M6 work packages\n\n#### M7 work packages\n| a |\n|---|', 6)).toThrow(
      /not followed by a table/,
    )
  })

  it('splits rows on unescaped pipes only', () => {
    expect(splitRow('| a | `b \\| c` | d |')).toEqual(['a', '`b \\| c`', 'd'])
  })
})

describe('plan generation', () => {
  it('creates a new plan with a Status column defaulting to planned, without writing', () => {
    const root = makeRepo()
    const result = buildPlan({ root, n: 5 })
    expect(result.content).toContain('| WP | Owner | Wave | Depends | Status | Objective | Write scope | Acceptance |')
    expect(result.content).toContain('| M5-W1 | Worker | 1 | M5-L1 | planned |')
    expect(result.content).toContain('## Changes from spec table')
    expect(result.added).toEqual(['M5-L1', 'M5-W1', 'M5-W2'])
    expect(existsSync(result.file)).toBe(false)
  })

  it('reproduces the real M0 plan unchanged', () => {
    const current = readText(paths.plan(REAL_ROOT, 0))
    const result = buildPlan({ root: REAL_ROOT, n: 0 })
    expect(result.added).toEqual([])
    expect(result.content).toBe(current)
  })
})

describe('plan merge', () => {
  it('keeps statuses, edited rows and notes; adds missing rows in spec order', () => {
    const existing = parseTableDocument(
      [
        '# M5 plan',
        '',
        '| WP | Owner | Wave | Depends | Status | Objective | Write scope | Acceptance |',
        '|---|---|---|---|---|---|---|---|',
        '| M5-L1 | Lead | 0 | — | merged | Edited objective | `x/` | done |',
        '',
        '## Changes from spec table',
        '- M5-W2 folded into the lead row (same files).',
        '',
      ].join('\n'),
    )
    const spec = extractSpecTable(readText(join(makeRepo(), 'docs', 'spec.md')), 5)
    const { doc, added } = mergePlan(existing, spec)
    expect(added).toEqual(['M5-W1'])
    expect(doc.table.rows.map((row) => [row[0], row[4]])).toEqual([
      ['M5-L1', 'merged'],
      ['M5-W1', 'planned'],
    ])
    expect(doc.table.rows[0]?.[5]).toBe('Edited objective')
    expect(changesSection(doc.after)).toContain('M5-W2 folded into the lead row')
  })
})

describe('status column', () => {
  it('adds a Status column to a plan table that lacks one', () => {
    const table = withStatusColumn({ headers: ['WP', 'Objective'], rows: [['M5-L1', 'x']] })
    expect(table).toEqual({ headers: ['WP', 'Objective', 'Status'], rows: [['M5-L1', 'x', 'planned']] })
  })
})
