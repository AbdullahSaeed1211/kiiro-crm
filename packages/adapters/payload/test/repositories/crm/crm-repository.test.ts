import { asId } from '@ops/kernel'
import { describe, expect, it } from 'vitest'
import {
  byCollection,
  DEAL_RECORD,
  dealDoc,
  guard,
  LEAD_RECORD,
  leadDoc,
  MS,
  SCOPED_READ,
  setup,
  TIMES,
  USER,
  workflowDoc,
} from './fixtures'

const ORGANIZATION_ID = 'o1'
const CONTACT_EMAIL = 'ada@example.com'
const ORGANIZATION_DOC = {
  id: ORGANIZATION_ID,
  name: 'Acme',
  website: null,
  email: 'hi@acme.test',
  owner: { id: 'u2' },
  source: 'src-referral',
  customData: { tier: 'gold' },
  ...TIMES,
}
const CONTACT_DOC = { id: 7, firstName: 'Ada', email: CONTACT_EMAIL, organization: ORGANIZATION_ID, ...TIMES }

describe('createCrmRepository get', () => {
  it('maps every record type with money, relationships and missing fields', async () => {
    const docs = { organizations: [ORGANIZATION_DOC], contacts: [CONTACT_DOC], leads: [leadDoc()], deals: [dealDoc()] }
    const { repo, calls, req } = setup(byCollection(docs))
    expect(await repo.get('organization', asId(ORGANIZATION_ID))).toEqual({
      id: ORGANIZATION_ID,
      name: 'Acme',
      website: null,
      phone: null,
      email: 'hi@acme.test',
      ownerId: 'u2',
      sourceId: 'src-referral',
      customData: { tier: 'gold' },
      ...MS,
    })
    expect(await repo.get('contact', asId('7'))).toEqual({
      id: '7',
      firstName: 'Ada',
      lastName: null,
      email: CONTACT_EMAIL,
      phone: null,
      organizationId: ORGANIZATION_ID,
      ownerId: null,
      customData: {},
      ...MS,
    })
    expect(await repo.get('lead', asId('l1'))).toEqual(LEAD_RECORD)
    expect(await repo.get('deal', asId('d1'))).toEqual(DEAL_RECORD)
    const collections = ['organizations', 'contacts', 'leads', 'deals']
    expect(calls.map((call) => call.args)).toMatchObject(
      collections.map((collection) => ({ collection, limit: 1, ...SCOPED_READ })),
    )
    expect(calls[0]?.args['req']).toBe(req)
  })
})

describe('createCrmRepository list', () => {
  it('reads every visible document with the user access and skips incomplete ones', async () => {
    const leads = [leadDoc(), leadDoc({ id: 'l2', workflow: null }), leadDoc({ id: 'l3', updatedAt: 'never' })]
    const { repo, calls } = setup(byCollection({ leads, deals: [dealDoc({ valueCurrency: null })] }))
    expect(await repo.list('lead')).toEqual([LEAD_RECORD])
    expect(await repo.list('deal')).toEqual([{ ...DEAL_RECORD, value: null }])
    expect(calls[0]?.args).toMatchObject({ collection: 'leads', where: {}, limit: 0, sort: ['-createdAt', 'id'] })
    expect(calls[0]?.args).toMatchObject(SCOPED_READ)
  })
})

describe('createCrmRepository create', () => {
  const draft = Object.fromEntries(
    Object.entries(DEAL_RECORD).filter(([key]) => !['id', 'createdAt', 'updatedAt'].includes(key)),
  )

  it('creates with the user access and maps draft fields to document fields', async () => {
    const { repo, calls, req } = setup({ create: (args) => Object.assign({ id: 'd1' }, TIMES, args['data']) })
    expect(await repo.create('deal', { ...draft, workflowId: asId('w-deal') } as never)).toEqual(DEAL_RECORD)
    expect(calls[0]?.args).toMatchObject({ collection: 'deals', depth: 0, overrideAccess: false, user: USER })
    expect(calls[0]?.args['req']).toBe(req)
    expect(calls[0]?.args['data']).toEqual({
      title: 'Retainer',
      organization: ORGANIZATION_ID,
      contacts: ['c1', 'c2'],
      primaryContact: 'c1',
      valueAmountMinor: 125_000,
      valueCurrency: 'USD',
      expectedCloseAt: 1_800_000_000_000,
      closedAt: null,
      sourceLead: 'l1',
      owner: null,
      assignees: [],
      workflow: 'w-deal',
      stageId: 's-proposal',
      stageEnteredAt: 5000,
      lostReason: 'lr-budget',
      lostNote: 'Budget cut',
      customData: {},
    })
  })

  it('fails when Payload returns an incomplete document', async () => {
    const { repo } = setup()
    await expect(repo.create('deal', draft as never)).rejects.toThrow('deals create returned an incomplete document')
  })
})

describe('createCrmRepository update', () => {
  it('writes only the patched fields through compare-and-set and maps the saved document', async () => {
    const saved = dealDoc({ valueAmountMinor: null, valueCurrency: null, lostNote: 'Too expensive' })
    const { repo, calls } = setup({ write: () => [{ id: 'd1' }], find: () => ({ docs: [saved] }) })
    const patch = { value: null, lostNote: 'Too expensive' }
    const record = await repo.update('deal', asId('d1'), patch, MS.updatedAt)
    expect(record).toEqual({ ...DEAL_RECORD, ...patch })
    expect(calls.find((call) => call.method === 'count')?.args).toMatchObject({
      collection: 'deals',
      where: { and: [guard('d1')] },
      overrideAccess: true,
    })
    expect(calls.find((call) => call.method === 'write')?.args['values']).toMatchObject({
      valueAmountMinor: null,
      valueCurrency: null,
      lostNote: 'Too expensive',
    })
  })

  it('returns undefined when the record changed meanwhile', async () => {
    const { repo, calls } = setup({ write: () => [] })
    expect(await repo.update('organization', asId(ORGANIZATION_ID), { name: 'Acme Ltd' }, MS.updatedAt)).toBeUndefined()
    expect(calls.find((call) => call.method === 'write')?.args['values']).toMatchObject({ name: 'Acme Ltd' })
  })
})

describe('createCrmRepository findContactByEmail', () => {
  it('matches the lower-cased email with the user access', async () => {
    const { repo, calls } = setup(byCollection({ contacts: [CONTACT_DOC] }))
    expect(await repo.findContactByEmail('  Ada@Example.COM ')).toMatchObject({ id: '7', email: CONTACT_EMAIL })
    expect(calls[0]?.args).toMatchObject({ where: { email: { equals: CONTACT_EMAIL } }, limit: 1, ...SCOPED_READ })
    expect(await repo.findContactByEmail(' ')).toBeUndefined()
    expect(calls).toHaveLength(1)
  })
})

describe('createCrmRepository lookups and workflows', () => {
  it('lists lookups sorted by name regardless of case', async () => {
    const lostReasons = [{ id: 'b', name: 'price' }, { name: 'no id' }, { id: 'a', name: 'Budget' }]
    const { repo, calls } = setup(byCollection({ lostReasons }))
    expect(await repo.listLookups('lostReason')).toEqual([
      { id: 'a', name: 'Budget' },
      { id: 'b', name: 'price' },
    ])
    expect(await repo.listLookups('source')).toEqual([])
    expect(calls.map((call) => call.args)).toMatchObject([
      { collection: 'lostReasons', sort: 'name', ...SCOPED_READ },
      { collection: 'sources', sort: 'name', ...SCOPED_READ },
    ])
  })

  it('loads the earliest workflow of the record type and fails when none exists', async () => {
    const { repo, calls } = setup(byCollection({ workflows: [workflowDoc('deal')] }))
    expect(await repo.loadDefaultWorkflow('deal')).toMatchObject({ id: 'w-deal', recordType: 'deal' })
    expect(calls[0]?.args).toMatchObject({ where: { recordType: { equals: 'deal' } }, sort: 'createdAt', limit: 1 })
    await expect(setup().repo.loadDefaultWorkflow('lead')).rejects.toThrow('No lead workflow is configured')
  })
})
