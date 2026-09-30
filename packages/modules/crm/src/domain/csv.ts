const BOM = '﻿'
// One cell and what ends it: a quoted cell (doubled quotes inside) or a bare one, then a comma, a line end or the end of input.
const CELL = /(?:"((?:[^"]|"")*)"|([^",\r\n]*))(,|\r\n|\n|\r|$)/y

/** Parses RFC 4180 CSV text into rows of cells, dropping blank lines. Throws when a quoted cell never closes. */
export function parseCsv(input: string): string[][] {
  const text = input.startsWith(BOM) ? input.slice(1) : input
  const rows: string[][] = []
  let row: string[] = []
  CELL.lastIndex = 0
  for (;;) {
    const match = CELL.exec(text)
    if (match === null) throw new Error('The file has a quoted value that is never closed')
    row.push(match[1] === undefined ? (match[2] ?? '') : match[1].replaceAll('""', '"'))
    if (match[3] !== ',') {
      rows.push(row)
      row = []
    }
    if (match[3] === '') break
  }
  return rows.filter((cells) => cells.some((value) => value.trim() !== ''))
}

const NEEDS_QUOTES = /[",\r\n]/u
const FORMULA_START = /^[=+\-@\t\r]/u
// Numbers and phone numbers ("+1 (555) 010-2000", "-5") start with these characters but cannot run anything.
const PHONE_OR_NUMBER = /^[+-]?[\d\s().-]+$/u

/** One cell, quoted when needed. A text cell that a spreadsheet would run as a formula gets a leading apostrophe. */
function csvCell(value: string): string {
  const safe = FORMULA_START.test(value) && !PHONE_OR_NUMBER.test(value) ? `'${value}` : value
  return NEEDS_QUOTES.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe
}

/** Formats rows as CSV with a byte order mark so spreadsheets read the text as UTF-8. */
export function formatCsv(rows: readonly (readonly string[])[]): string {
  return `${BOM}${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`
}
