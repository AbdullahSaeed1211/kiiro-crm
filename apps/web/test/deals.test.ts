import { asId } from '@ops/kernel'
import { describe, expect, it } from 'vitest'
import { aggregateStageTotals, formatMoney } from '../src/server/crm/deals/view-model'

const workflow = {
  id: asId('deal-workflow'),
  recordType: 'deal',
  name: 'Sales pipeline',
  defaultStageId: asId('qualified'),
  stages: [
    { id: asId('qualified'), name: 'Qualified', category: 'open' as const, color: 'blue' as const, position: 0 },
    { id: asId('won'), name: 'Won', category: 'done_success' as const, color: 'green' as const, position: 1 },
  ],
}

function deal(id: string, stageId: string, amountMinor: number) {
  return {
    id: asId(id),
    title: id,
    organizationId: null,
    contactIds: [],
    primaryContactId: null,
    value: { amountMinor, currency: 'USD' },
    expectedCloseAt: null,
    closedAt: null,
    ownerId: null,
    assigneeIds: [],
    workflowId: workflow.id,
    stageId: asId(stageId),
    stageEnteredAt: 0,
    lostReasonId: null,
    lostNote: null,
    sourceLeadId: null,
    customData: {},
    createdAt: 0,
    updatedAt: 0,
  }
}

describe('deal view model', () => {
  it('sums values by stage while preserving empty stages', () => {
    expect(aggregateStageTotals([deal('a', 'qualified', 12500), deal('b', 'qualified', 7500)], workflow)).toEqual([
      expect.objectContaining({ stageId: 'qualified', count: 2, amountMinor: 20000, currency: 'USD' }),
      expect.objectContaining({ stageId: 'won', count: 0, amountMinor: 0, currency: null }),
    ])
  })

  it('formats minor units as tenant-facing currency text', () => {
    expect(formatMoney({ amountMinor: 125000, currency: 'USD' })).toContain('$1,250.00')
    expect(formatMoney(null)).toBe('—')
  })
})
