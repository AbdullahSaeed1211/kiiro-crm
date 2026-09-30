import { asId } from '@ops/kernel'
import type { Stage } from '@ops/platform'
import { describe, expect, it } from 'vitest'
import { pipelineSummary } from '../src/domain/insights'
import type { DealRecord, LeadRecord } from '../src/ports/records'

const stage = (input: { id: string; name: string; category: Stage['category']; position: number }): Stage => ({
  ...input,
  id: asId(input.id),
  color: 'blue',
})
const dealStages = [
  stage({ id: 'open', name: 'Open', category: 'active', position: 1 }),
  stage({ id: 'won', name: 'Won', category: 'done_success', position: 2 }),
  stage({ id: 'lost', name: 'Lost', category: 'done_failure', position: 3 }),
]
const leadStages = [stage({ id: 'new', name: 'New', category: 'open', position: 1 })]
const NOW = Date.UTC(2026, 9, 15)
let sequence = 0

const deal = (input: { stageId: string; minor: number; currency?: string; closed?: number }): DealRecord => {
  sequence += 1
  return {
    id: asId(`deal-${String(sequence)}`),
    stageId: asId(input.stageId),
    value: { amountMinor: input.minor, currency: input.currency ?? 'USD' },
    closedAt: input.closed ?? null,
  } as unknown as DealRecord
}
const lead = (sourceId: string | null): LeadRecord => {
  sequence += 1
  return {
    id: asId(`lead-${String(sequence)}`),
    stageId: asId('new'),
    sourceId: sourceId === null ? null : asId(sourceId),
  } as unknown as LeadRecord
}
const summarize = (input: {
  leads?: LeadRecord[]
  deals?: DealRecord[]
  sources?: [string, string][]
  months?: number
}) =>
  pipelineSummary({
    leads: input.leads ?? [],
    deals: input.deals ?? [],
    leadStages,
    dealStages,
    sources: new Map(input.sources ?? []),
    now: NOW,
    months: input.months ?? 3,
  })

describe('pipelineSummary stages', () => {
  it('totals deal value per stage in the dominant currency and leaves other currencies out of values', () => {
    const summary = summarize({
      deals: [
        deal({ stageId: 'open', minor: 1000 }),
        deal({ stageId: 'open', minor: 500 }),
        deal({ stageId: 'open', minor: 9999, currency: 'EUR' }),
      ],
    })
    expect(summary.currency).toBe('USD')
    expect(summary.dealStages[0]).toMatchObject({ name: 'Open', count: 3, valueMinor: 1500 })
  })
})

describe('pipelineSummary revenue', () => {
  it('counts revenue won in the month a deal closed and computes the win rate', () => {
    const summary = summarize({
      deals: [
        deal({ stageId: 'won', minor: 2000, closed: Date.UTC(2026, 9, 2) }),
        deal({ stageId: 'won', minor: 3000, closed: Date.UTC(2026, 8, 20) }),
        deal({ stageId: 'lost', minor: 100, closed: Date.UTC(2026, 9, 3) }),
      ],
    })
    expect(summary.wonByMonth.map((month) => [month.month, month.valueMinor])).toEqual([
      ['2026-08', 0],
      ['2026-09', 3000],
      ['2026-10', 2000],
    ])
    expect(summary.winRate).toBeCloseTo(2 / 3)
  })
})

describe('pipelineSummary sources', () => {
  it('groups leads by source name, biggest first, and has no win rate before a deal closes', () => {
    const summary = summarize({
      leads: [lead('s1'), lead('s1'), lead('s2'), lead(null)],
      sources: [
        ['s1', 'Referral'],
        ['s2', 'Ads'],
      ],
      months: 1,
    })
    expect(summary.leadSources).toEqual([
      { name: 'Referral', count: 2 },
      { name: 'Ads', count: 1 },
      { name: 'No source', count: 1 },
    ])
    expect(summary.winRate).toBeNull()
  })
})
