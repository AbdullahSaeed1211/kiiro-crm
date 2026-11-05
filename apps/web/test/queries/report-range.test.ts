import { describe, expect, it } from 'vitest'
import { resolveReportRange } from '../../src/server/queries/report-range'

const NOW = Date.UTC(2026, 10, 4)

// A custom range that cannot be applied used to fall back to 30 days without a word, and 2026-02-31 became March 3.
describe('resolveReportRange custom ranges', () => {
  it('applies a valid range', () => {
    const range = resolveReportRange({ range: 'custom', from: '2026-10-01', to: '2026-10-31', now: NOW })
    expect(range).toMatchObject({ fromDate: '2026-10-01', toDate: '2026-10-31' })
    expect(range.problem).toBeUndefined()
  })

  it('refuses a day that does not exist and keeps what was typed', () => {
    const range = resolveReportRange({ range: 'custom', from: '2026-02-31', to: '2026-03-10', now: NOW })
    expect(range.problem).toBe('invalid')
    expect(range.entered).toEqual({ from: '2026-02-31', to: '2026-03-10' })
  })

  it('flags a reversed range', () => {
    const range = resolveReportRange({ range: 'custom', from: '2026-10-31', to: '2026-10-01', now: NOW })
    expect(range.problem).toBe('reversed')
  })
})
