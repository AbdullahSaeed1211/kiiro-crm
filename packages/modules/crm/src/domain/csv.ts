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
