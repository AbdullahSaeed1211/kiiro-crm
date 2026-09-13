/** Markdown pipe tables as used by spec §21.3 and `docs/orchestration/m<N>/plan.md`. */
export interface Table {
  headers: string[]
  rows: string[][]
}

/** A table embedded in a markdown document, with the text around it preserved verbatim. */
export interface TableDocument {
  before: string[]
  table: Table
  after: string[]
}

const SEPARATOR = /^\|(?:\s*:?-+:?\s*\|)+$/

/** Splits a `| a | b |` line on unescaped pipes. */
export function splitRow(line: string): string[] {
  const body = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  const cells: string[] = []
  let current = ''
  for (let i = 0; i < body.length; i++) {
    const ch = body.charAt(i)
    if (ch === '|' && body.charAt(i - 1) !== '\\') {
      cells.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  cells.push(current.trim())
  return cells
}

function isTableLine(line: string | undefined): boolean {
  return line?.trim().startsWith('|') === true
}

/** Parses table lines (header, separator, rows). */
export function parseTable(lines: string[]): Table {
  const [head, separator, ...body] = lines
  if (head === undefined || separator === undefined || !SEPARATOR.test(separator.trim())) {
    throw new Error('not a markdown table (missing header or separator row)')
  }
  return { headers: splitRow(head), rows: body.map(splitRow) }
}

/** Finds the first table at or after `start`, returning its line span. */
export function locateTable(lines: string[], start = 0): { from: number; to: number } | undefined {
  const from = lines.findIndex((line, i) => i >= start && isTableLine(line))
  if (from < 0) return undefined
  let to = from
  while (isTableLine(lines[to])) to += 1
  return { from, to }
}

/** Splits a document into text before the first table, the table and the text after it. */
export function parseTableDocument(text: string): TableDocument {
  const lines = text.split(/\r?\n/)
  const span = locateTable(lines)
  if (span === undefined) throw new Error('document contains no markdown table')
  return {
    before: lines.slice(0, span.from),
    table: parseTable(lines.slice(span.from, span.to)),
    after: lines.slice(span.to),
  }
}

export function renderTable(table: Table): string[] {
  const line = (cells: string[]): string => `| ${cells.join(' | ')} |`
  return [line(table.headers), `|${table.headers.map(() => '---').join('|')}|`, ...table.rows.map(line)]
}

export function renderTableDocument(doc: TableDocument): string {
  return [...doc.before, ...renderTable(doc.table), ...doc.after].join('\n')
}

/** Returns the cell under `header` for a row, or an empty string. */
export function cell(table: Table, row: string[], header: string): string {
  const index = table.headers.indexOf(header)
  return index < 0 ? '' : (row[index] ?? '')
}

/** Returns the contents of every `backtick` span in a cell. */
export function codeSpans(text: string): string[] {
  return [...text.matchAll(/`([^`]+)`/g)].map((m) => m[1] ?? '').filter((s) => s !== '')
}
