import { describe, expect, it } from 'vitest'
import { resolveReportRange } from '../src/server/queries/report-range'

const NOW = Date.parse('2026-09-15T13:45:00.000Z')

describe('report ranges', () => {
  it('resolves presets to inclusive calendar dates', () => {
    expect(resolveReportRange({ range: '7d', now: NOW })).toMatchObject({
      key: '7d',
      fromDate: '2026-09-09',
      toDate: '2026-09-15',
    })
    expect(resolveReportRange({ range: 'ytd', now: NOW })).toMatchObject({
      key: 'ytd',
      fromDate: '2026-01-01',
      toDate: '2026-09-15',
    })
  })

  it('accepts a valid custom range and safely falls back for invalid input', () => {
    expect(resolveReportRange({ range: 'custom', from: '2026-02-03', to: '2026-02-08', now: NOW })).toMatchObject({
      key: 'custom',
      fromDate: '2026-02-03',
      toDate: '2026-02-08',
    })
    expect(resolveReportRange({ range: 'custom', from: 'not-a-date', to: '2026-02-08', now: NOW })).toMatchObject({
      key: 'custom',
      fromDate: '2026-08-17',
      toDate: '2026-09-15',
    })
  })
})
