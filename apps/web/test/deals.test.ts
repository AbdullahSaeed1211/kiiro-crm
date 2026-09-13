import { asId } from '@ops/kernel'
import { describe, expect, it, vi } from 'vitest'
import { loadActivity } from '../src/server/crm/deals/activity'
import type { RequestContext } from '../src/server/work/deps'
import { aggregateStageTotals, filterDeals, formatMoney, withDefaultOwner } from '../src/server/crm/deals/view-model'

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

function listItems() {
  return [
    {
      deal: deal('website', 'qualified', 100),
      stage: workflow.stages[0],
      organizationName: 'Acme',
      primaryContactName: null,
      ownerName: null,
    },
    {
      deal: deal('retainer', 'won', 200),
      stage: workflow.stages[1],
      organizationName: 'Beta',
      primaryContactName: null,
      ownerName: null,
    },
  ]
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

  it('filters by search text and workflow stage', () => {
    expect(filterDeals(listItems(), 'acme', 'qualified').map((item) => item.deal.id)).toEqual(['website'])
    expect(filterDeals(listItems(), '', 'won').map((item) => item.deal.id)).toEqual(['retainer'])
  })

  it('defaults an unassigned create to the authenticated actor', () => {
    expect(withDefaultOwner({ title: 'Deal', ownerId: null }, 'actor-1')).toMatchObject({ ownerId: 'actor-1' })
    expect(withDefaultOwner({ title: 'Deal' }, 'actor-1')).toMatchObject({ ownerId: 'actor-1' })
  })

  it('passes the authenticated request into authorized activity reads', async () => {
    const user = { id: 'staff-1' }
    const find = vi.fn().mockResolvedValue({ docs: [] })
    const context = {
      payload: { find } as unknown as RequestContext['payload'],
      req: { user } as RequestContext['req'],
    }
    await loadActivity(context, 'deal-1', true)
    expect(find).toHaveBeenCalledWith(expect.objectContaining({ overrideAccess: true, user, req: context.req }))
  })
})
