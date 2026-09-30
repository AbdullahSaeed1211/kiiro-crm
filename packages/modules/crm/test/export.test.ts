import { describe, expect, it } from 'vitest'
import { formatCsv } from '../src/domain/csv'
import { parseCsv } from '../src/domain/csv'

// Spreadsheet programs run a text cell that starts with = + - or @ as a formula, which is how exported data becomes an attack.
describe('formatCsv', () => {
  it('neutralises cells a spreadsheet would run as formulas', () => {
    const csv = formatCsv([['=HYPERLINK("http://evil.test","x")', '@SUM(A1)', '+cmd|calc', '-2+3+cmd|x']])
    const cells = parseCsv(csv)[0] ?? []
    expect(cells.every((cell) => cell.startsWith("'"))).toBe(true)
  })

  it('leaves phone numbers, negative numbers and plain text alone', () => {
    const cells = parseCsv(formatCsv([['+1 (555) 010-2000', '-5', '3.5', 'Acme, Inc.']]))[0] ?? []
    expect(cells).toEqual(['+1 (555) 010-2000', '-5', '3.5', 'Acme, Inc.'])
  })

  it('round-trips quotes, commas and line breaks through the parser', () => {
    const rows = [['a', 'say "hi"', 'line\nbreak', 'x, y']]
    expect(parseCsv(formatCsv(rows))).toEqual(rows)
  })
})
