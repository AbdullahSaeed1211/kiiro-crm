import { createCrmRepository } from '../../../src/repositories/crm'
import { fakeRequest, type Handlers } from '../fake-payload'

/** The signed-in staff user of every fake request. */
export const USER = { id: 'u1', role: 'staff', active: true }

const CREATED = '2026-09-01T00:00:00.000Z'
const UPDATED = '2026-09-13T10:00:00.000Z'

/** Payload document timestamps. */
export const TIMES = { createdAt: CREATED, updatedAt: UPDATED }

/** `TIMES` as epoch ms. */
export const MS = { createdAt: Date.parse(CREATED), updatedAt: Date.parse(UPDATED) }

/** Options of a read with the request user's access. */
export const SCOPED_READ = { overrideAccess: false, user: USER, depth: 0, pagination: false }

/** The compare-and-set `where` for document `id` at `TIMES.updatedAt`. */
export const guard = (id: string) => ({ and: [{ id: { equals: id } }, { updatedAt: { equals: UPDATED } }] })

/** A leads document with a populated organization, mixed assignees and no stage entry time. */
export const leadDoc = (extra: object = {}) => ({
  id: 'l1',
  title: 'Website rebuild',
  firstName: 'Ada',
  lastName: null,
  email: 'ada@example.com',
  companyName: 'Acme',
  organization: { id: 'o1', name: 'Acme' },
  source: 'src-web',
  owner: 'u2',
  assignees: ['u1', { id: 'u3' }],
  workflow: 'w-lead',
  stageId: 's-new',
  lostReason: null,
  convertedAt: null,
  ...TIMES,
  ...extra,
})

/** The record `leadDoc()` maps to. */
export const LEAD_RECORD = {
  id: 'l1',
  title: 'Website rebuild',
  firstName: 'Ada',
  lastName: null,
  email: 'ada@example.com',
  phone: null,
  companyName: 'Acme',
  organizationId: 'o1',
  sourceId: 'src-web',
  convertedAt: null,
  convertedDealId: null,
  ownerId: 'u2',
  assigneeIds: ['u1', 'u3'],
  workflowId: 'w-lead',
  stageId: 's-new',
  stageEnteredAt: MS.createdAt,
  lostReasonId: null,
  lostNote: null,
  ...MS,
}

/** A deals document with money, populated relationships and no owner. */
export const dealDoc = (extra: object = {}) => ({
  id: 'd1',
  title: 'Retainer',
  organization: 'o1',
  contacts: ['c1', { id: 'c2' }],
  primaryContact: { id: 'c1' },
  valueAmountMinor: 125_000,
  valueCurrency: 'USD',
  expectedCloseAt: 1_800_000_000_000,
  closedAt: null,
  owner: null,
  assignees: [],
  workflow: { id: 'w-deal' },
  stageId: 's-proposal',
  stageEnteredAt: 5000,
  sourceLead: 'l1',
  lostReason: 'lr-budget',
  lostNote: 'Budget cut',
  ...TIMES,
  ...extra,
})

/** The record `dealDoc()` maps to. */
export const DEAL_RECORD = {
  id: 'd1',
  title: 'Retainer',
  organizationId: 'o1',
  contactIds: ['c1', 'c2'],
  primaryContactId: 'c1',
  value: { amountMinor: 125_000, currency: 'USD' },
  expectedCloseAt: 1_800_000_000_000,
  closedAt: null,
  sourceLeadId: 'l1',
  ownerId: null,
  assigneeIds: [],
  workflowId: 'w-deal',
  stageId: 's-proposal',
  stageEnteredAt: 5000,
  lostReasonId: 'lr-budget',
  lostNote: 'Budget cut',
  ...MS,
}

/** A workflows document for record type `recordType`. */
export const workflowDoc = (recordType: string) => ({
  id: `w-${recordType}`,
  recordType,
  name: 'Pipeline',
  defaultStageId: 's-new',
  stages: [{ id: 's-new', name: 'New', category: 'open', color: 'blue', position: 0 }],
})

/** Answers `find` with the documents listed for the queried collection. */
export function byCollection(docs: Readonly<Record<string, readonly object[]>>): Handlers {
  return {
    find: (args) => {
      const collection = args['collection']
      return { docs: typeof collection === 'string' ? (docs[collection] ?? []) : [] }
    },
  }
}

/** A CRM repository on a fake request for `USER`. */
export function setup(handlers: Handlers = {}) {
  const fake = fakeRequest(USER, handlers)
  return { ...fake, repo: createCrmRepository(fake.req) }
}
