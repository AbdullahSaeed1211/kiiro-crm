import { formatNumber, type BillingDocument, type BillingRepository } from '@ops/module-billing'
import type { PayloadRequest, Where } from 'payload'
import { COLLECTIONS } from '../contracts/names'
import { toBillingDocument } from './billing-mapping'
import { textOf } from './documents'
import { createAsUser } from './crm/local-writes'
import { findAsUser, pageAsUser, updateIfUnchanged } from './local-api'

const COLLECTION = COLLECTIONS.billingDocuments

/** The next counter for a kind: one past the highest number used so far. */
async function nextCounter(req: PayloadRequest, kind: string): Promise<number> {
  const [latest] = await req.payload
    .find({
      collection: COLLECTION,
      where: { kind: { equals: kind } },
      sort: '-number',
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })
    .then((page) => page.docs)
  const last = latest === undefined ? '' : (textOf(latest, 'number') ?? '')
  return (Number(last.split('-')[1]) || 0) + 1
}

const MAX_NUMBER_TRIES = 5

const toStored = (input: Parameters<BillingRepository['create']>[0], counter: number): Record<string, unknown> => ({
  kind: input.kind,
  number: formatNumber(input.kind, counter),
  status: 'draft',
  organization: input.organizationId,
  deal: input.dealId,
  contact: input.contactId,
  currency: input.currency,
  lines: input.lines,
  note: input.note,
  dueAt: input.dueAt,
  paymentLink: input.paymentLink,
  sourceQuoteId: input.sourceQuoteId,
  subtotalMinor: input.subtotalMinor,
  taxMinor: input.taxMinor,
  totalMinor: input.totalMinor,
  createdBy: input.createdById,
})

/** Saves with the next number; the unique index rejects a clash and the next counter is tried. */
async function createNumbered(req: PayloadRequest, input: Parameters<BillingRepository['create']>[0]) {
  for (let attempt = 0; attempt < MAX_NUMBER_TRIES; attempt += 1) {
    const counter = (await nextCounter(req, input.kind)) + attempt
    try {
      const mapped = toBillingDocument(await createAsUser(req, COLLECTION, toStored(input, counter)))
      if (mapped !== undefined) return mapped
    } catch (error) {
      if (attempt === MAX_NUMBER_TRIES - 1) throw error
    }
  }
  throw new Error('Could not save the document')
}

/** Quotes and invoices on the Payload Local API. */
export function createBillingRepository(req: PayloadRequest): BillingRepository {
  return {
    create: (input) => createNumbered(req, input),
    get: async (id) => {
      const [doc] = await findAsUser(req, { collection: COLLECTION, where: { id: { equals: id } }, limit: 1 })
      return doc === undefined ? undefined : toBillingDocument(doc)
    },
    update: async ({ id, expectedUpdatedAt, change }) => {
      const data = {
        ...change,
        ...('contactId' in change ? { contact: change.contactId, contactId: undefined } : {}),
      }
      const doc = await updateIfUnchanged(req, { collection: COLLECTION, id, expectedUpdatedAt, data: stored(data) })
      return doc === undefined ? undefined : toBillingDocument(doc)
    },
    organizationVisible: async (id) =>
      (await findAsUser(req, { collection: COLLECTIONS.organizations, where: { id: { equals: id } }, limit: 1 }))
        .length > 0,
  }
}

/** Drops keys that were only renamed or are unset, so the guarded write sees real columns only. */
function stored(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined))
}

/** One page of quotes and invoices the actor may see, newest first. */
export async function listBillingPage(
  req: PayloadRequest,
  query: Readonly<{ where: Where; page: number; limit: number }>,
): Promise<{ readonly records: BillingDocument[]; readonly total: number }> {
  return pageAsUser(req, { collection: COLLECTION, sort: ['-createdAt', 'id'], ...query }, toBillingDocument)
}
