import { asId } from '@ops/kernel'
import { describe, expect, it } from 'vitest'
import { byCollection, dealDoc, guard, leadDoc, MS, SCOPED_READ, setup, workflowDoc } from './fixtures'

const LEAD_REF = { type: 'lead', id: asId('l1') }
const DEAL_REF = { type: 'deal', id: asId('d1') }

describe('createCrmRepository loadRecord', () => {
  it('loads leads and deals with owner and assignees and ignores other record types', async () => {
    const { repo, calls } = setup(byCollection({ leads: [leadDoc()], deals: [dealDoc()] }))
    expect(await repo.loadRecord(LEAD_REF)).toEqual({
      ref: LEAD_REF,
      workflowId: 'w-lead',
      stageId: 's-new',
      stageEnteredAt: MS.createdAt,
      updatedAt: MS.updatedAt,
      ownerId: 'u2',
      assigneeIds: ['u1', 'u3'],
    })
    const deal = await repo.loadRecord(DEAL_REF)
    expect(deal).toMatchObject({ ref: DEAL_REF, workflowId: 'w-deal', stageEnteredAt: 5000, assigneeIds: [] })
    expect(deal).not.toHaveProperty('ownerId')
    expect(await repo.loadRecord({ type: 'task', id: asId('t1') })).toBeUndefined()
    expect(calls.map((call) => call.args)).toMatchObject([
      { collection: 'leads', where: { id: { equals: 'l1' } }, limit: 1, ...SCOPED_READ },
      { collection: 'deals', where: { id: { equals: 'd1' } }, limit: 1, ...SCOPED_READ },
    ])
  })

  it('maps workflows read with the user access', async () => {
    const { repo, calls } = setup(byCollection({ workflows: [workflowDoc('lead')] }))
    expect(await repo.loadWorkflow(asId('w-lead'))).toEqual({
      id: 'w-lead',
      recordType: 'lead',
      name: 'Pipeline',
      defaultStageId: 's-new',
      stages: [{ id: 's-new', name: 'New', category: 'open', color: 'blue', position: 0 }],
    })
    expect(calls[0]?.args).toMatchObject({
      collection: 'workflows',
      where: { id: { equals: 'w-lead' } },
      ...SCOPED_READ,
    })
  })
})

describe('createCrmRepository saveStage', () => {
  it('saves the stage by compare-and-set with the user access', async () => {
    const saved = leadDoc({ stageId: 's-won', stageEnteredAt: 9000, updatedAt: '2026-09-13T10:00:01.000Z' })
    const { repo, calls } = setup({ write: () => [{ id: 'l1' }], find: () => ({ docs: [saved] }) })
    const input = { ref: LEAD_REF, stageId: asId('s-won'), stageEnteredAt: 9000, expectedUpdatedAt: MS.updatedAt }
    expect(await repo.saveStage(input)).toMatchObject({ stageId: 's-won', updatedAt: MS.updatedAt + 1000 })
    expect(calls.find((call) => call.method === 'count')?.args).toMatchObject({
      collection: 'leads',
      where: { and: [guard('l1')] },
      overrideAccess: true,
    })
    expect(calls.find((call) => call.method === 'write')?.args['values']).toMatchObject({
      stageId: 's-won',
      stageEnteredAt: 9000,
    })
  })
})

describe('createCrmRepository deal saveStage', () => {
  it('sets deal closedAt in the same conditional write as a terminal stage', async () => {
    const current = dealDoc()
    const saved = dealDoc({ stageId: 's-won', stageEnteredAt: 9000, closedAt: 9000 })
    let dealReads = 0
    const { repo, calls } = setup({
      find: (args) => {
        if (args['collection'] === 'workflows') {
          return {
            docs: [
              {
                ...workflowDoc('deal'),
                stages: [{ ...workflowDoc('deal').stages[0], id: 's-won', category: 'done_success' }],
              },
            ],
          }
        }
        if (args['collection'] === 'deals') return { docs: [dealReads++ === 0 ? current : saved] }
        return { docs: [] }
      },
      write: () => [{ id: 'd1' }],
    })
    const input = { ref: DEAL_REF, stageId: asId('s-won'), stageEnteredAt: 9000, expectedUpdatedAt: MS.updatedAt }
    expect(await repo.saveStage(input)).toMatchObject({ stageId: 's-won' })
    expect(calls.find((call) => call.method === 'write')?.args['values']).toMatchObject({
      stageId: 's-won',
      stageEnteredAt: 9000,
      closedAt: 9000,
    })
  })
})

describe('createCrmRepository saveStage conflicts', () => {
  it('returns undefined on a compare-and-set miss and for other record types', async () => {
    const { repo, calls } = setup()
    const input = { ref: DEAL_REF, stageId: asId('s-won'), stageEnteredAt: 1, expectedUpdatedAt: MS.updatedAt }
    expect(await repo.saveStage(input)).toBeUndefined()
    expect(await repo.saveStage({ ...input, ref: { type: 'contact', id: asId('c1') } })).toBeUndefined()
    expect(calls.filter((call) => call.method === 'find')).toHaveLength(1)
    expect(calls.find((call) => call.method === 'find')?.args).toMatchObject({ collection: 'deals' })
    expect(calls.filter((call) => call.method === 'count')).toHaveLength(0)
  })
})

describe('createCrmRepository audit writes', () => {
  it('writes stage transitions and activity as system work on the same request', async () => {
    const { repo, calls, req } = setup()
    await repo.addTransition({
      record: DEAL_REF,
      workflowId: asId('w-deal'),
      fromStageId: asId('s-proposal'),
      toStageId: asId('s-won'),
      fromCategory: 'active',
      toCategory: 'done_success',
      changedBy: asId('u1'),
      changedAt: 7000,
      durationMs: 2000,
    })
    await repo.addActivity({ record: DEAL_REF, verb: 'stage.changed', actorId: asId('u1'), data: {}, occurredAt: 7000 })
    expect(calls.map((call) => call.args)).toMatchObject([
      { collection: 'stageTransitions', overrideAccess: true, depth: 0 },
      { collection: 'activity', overrideAccess: true, depth: 0 },
    ])
    expect(calls.map((call) => call.args['data'])).toEqual([
      {
        recordType: 'deal',
        recordId: 'd1',
        workflow: 'w-deal',
        fromStageId: 's-proposal',
        toStageId: 's-won',
        fromCategory: 'active',
        toCategory: 'done_success',
        changedBy: 'u1',
        changedAt: 7000,
        durationMs: 2000,
      },
      { recordType: 'deal', recordId: 'd1', actor: 'u1', verb: 'stage.changed', data: {}, occurredAt: 7000 },
    ])
    expect(calls.every((call) => call.args['req'] === req)).toBe(true)
  })
})
