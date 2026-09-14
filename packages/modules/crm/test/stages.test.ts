import { describe, expect, it } from 'vitest'
import { convertLead, markLost, moveDeal, moveLead } from '../src/commands'
import { convertInput, dealWorkflow, makeDeps, seedLead } from './memory-crm'

describe('CRM stage invariants', () => {
  it('T-CRM-5 requires a lost reason before entering a lost stage', async () => {
    const context = makeDeps()
    const result = await moveLead(context, {
      leadId: seedLead.id,
      toStageId: 'lead-lost',
      expectedUpdatedAt: seedLead.updatedAt,
    })
    expect(result).toMatchObject({ ok: false, error: { code: 'VALIDATION' } })
    expect((await context.repo.get('lead', seedLead.id))?.stageId).toBe('lead-open')
  })

  it('T-CRM-6 prevents staff from converting an out-of-scope lead', async () => {
    expect(await convertLead(makeDeps(undefined, 'staff'), convertInput)).toMatchObject({
      ok: false,
      error: { code: 'FORBIDDEN' },
    })
  })

  it('rejects stale markLost without changing the record or audit rows', async () => {
    const context = makeDeps()
    const result = await markLost(context, { id: seedLead.id, expectedUpdatedAt: 4_999, lostReasonId: 'reason-budget' })
    expect(result).toMatchObject({ ok: false, error: { code: 'CONFLICT' } })
    expect(await context.repo.get('lead', seedLead.id)).toMatchObject({ stageId: 'lead-open', lostReasonId: null })
    expect(context.repo.transitions).toHaveLength(0)
    expect(context.repo.activities).toHaveLength(0)
  })
})

describe('CRM terminal behavior', () => {
  it('locks converted lead stages and sets/clears deal closedAt', async () => {
    const context = makeDeps()
    expect((await convertLead(context, convertInput)).ok).toBe(true)
    const converted = await context.repo.get('lead', seedLead.id)
    expect(converted?.stageId).toBe('lead-won')
    expect(
      await moveLead(context, { leadId: seedLead.id, toStageId: 'lead-open', expectedUpdatedAt: converted?.updatedAt }),
    ).toMatchObject({ ok: false, error: { code: 'VALIDATION' } })
    const deal = (await context.repo.list('deal'))[0]
    if (deal === undefined) throw new Error('expected converted deal')
    const won = await moveDeal(context, { dealId: deal.id, toStageId: 'deal-won', expectedUpdatedAt: deal.updatedAt })
    expect(won.ok && won.value.closedAt).toBe(10_000)
    const reopened = await moveDeal(context, {
      dealId: deal.id,
      toStageId: 'deal-open',
      expectedUpdatedAt: won.ok ? won.value.updatedAt : 0,
    })
    expect(reopened.ok && reopened.value.closedAt).toBeNull()
  })

  it('markLost writes the reason and moves a deal through changeStage', async () => {
    const context = makeDeps()
    expect((await convertLead(context, convertInput)).ok).toBe(true)
    const deal = (await context.repo.list('deal'))[0]
    if (deal === undefined) throw new Error('expected converted deal')
    const result = await markLost(context, {
      id: deal.id,
      expectedUpdatedAt: deal.updatedAt,
      lostReasonId: 'reason-budget',
      lostNote: 'Too expensive',
    })
    expect(result.ok).toBe(true)
    expect((await context.repo.get('deal', deal.id))?.stageId).toBe('deal-lost')
    expect((await context.repo.get('deal', deal.id))?.lostReasonId).toBe('reason-budget')
    expect(dealWorkflow.stages.some((stage) => stage.id === 'deal-lost')).toBe(true)
  })
})
