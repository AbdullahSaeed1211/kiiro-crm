import { existsSync } from 'node:fs'
import { cell, codeSpans, locateTable, parseTable, parseTableDocument, type Table } from './table.ts'
import { milestoneOf, paths, readText } from './repo.ts'

/** One work package row from a spec §21.3 table or a milestone plan. */
export interface PlanRow {
  wp: string
  owner: string
  wave: string
  depends: string
  status: string
  objective: string
  writeScope: string
  acceptance: string
}

/** Extracts the `#### M<N> work packages` table from the spec text. */
export function extractSpecTable(spec: string, n: number): Table {
  const lines = spec.split(/\r?\n/)
  const heading = `#### M${String(n)} work packages`
  const headingIndex = lines.findIndex((line) => line.trim() === heading)
  if (headingIndex < 0) throw new Error(`spec has no "${heading}" section`)
  const span = locateTable(lines, headingIndex + 1)
  const between = span === undefined ? [] : lines.slice(headingIndex + 1, span.from)
  if (span === undefined || between.some((line) => line.startsWith('#'))) {
    throw new Error(`"${heading}" is not followed by a table`)
  }
  return parseTable(lines.slice(span.from, span.to))
}

export function toPlanRows(table: Table): PlanRow[] {
  return table.rows.map((row) => ({
    wp: cell(table, row, 'WP'),
    owner: cell(table, row, 'Owner'),
    wave: cell(table, row, 'Wave'),
    depends: cell(table, row, 'Depends'),
    status: cell(table, row, 'Status'),
    objective: cell(table, row, 'Objective'),
    writeScope: cell(table, row, 'Write scope'),
    acceptance: cell(table, row, 'Acceptance'),
  }))
}

/** Loads a WP row from `docs/orchestration/m<N>/plan.md`, falling back to the spec table. */
export function loadPlanRow(root: string, wp: string): { row: PlanRow; source: 'plan' | 'spec' } {
  const { number } = milestoneOf(wp)
  const planFile = paths.plan(root, number)
  const source = existsSync(planFile) ? 'plan' : 'spec'
  const table =
    source === 'plan'
      ? parseTableDocument(readText(planFile)).table
      : extractSpecTable(readText(paths.spec(root)), number)
  const row = toPlanRows(table).find((r) => r.wp === wp)
  if (row === undefined) throw new Error(`${wp} not found in the ${source} table for M${String(number)}`)
  return { row, source }
}

/** Splits a write-scope cell (`;`-separated, usually backticked) into path entries. */
export function scopeEntries(writeScope: string): string[] {
  const spans = codeSpans(writeScope)
  const entries = spans.length > 0 ? spans : writeScope.split(';')
  return entries.map((entry) => entry.trim()).filter((entry) => entry !== '')
}

/** WP ids listed in a `Depends` cell (`—` means none). */
export function dependencyIds(depends: string): string[] {
  return depends
    .split(',')
    .map((d) => d.trim())
    .filter((d) => /^M\d+-[LWX]\d+[a-z]?$/.test(d))
}
