import { listBillingPage } from '@ops/adapter-payload'
import { asId } from '@ops/kernel'
import { isExpired, isOverdue, type BillingDocument, type DocumentKind } from '@ops/module-billing'
import type { Where } from 'payload'
import type { RequestContext } from '../container'
import { billingDeps } from './deps'

export const BILLING_PAGE_SIZE = 25

interface BillingRow {
  readonly id: string
  readonly number: string
  readonly kind: DocumentKind
  /** The stored state, or `overdue` / `expired` when the dates say so. */
  readonly shown: string
  readonly company: string
  readonly totalMinor: number
  readonly currency: string
  readonly dueAt: number | null
}

export interface BillingPage {
  readonly rows: readonly BillingRow[]
  readonly total: number
  readonly page: number
}

/** The state to show: overdue and expired are worked out from the dates and never stored. */
function shownStatus(document: Pick<BillingDocument, 'kind' | 'status' | 'dueAt'>, now: number): string {
  if (isOverdue(document, now)) return 'overdue'
  return isExpired(document, now) ? 'expired' : document.status
}

/** Company names by id, for the companies a list of documents points at. */
async function companyNames(context: RequestContext, ids: readonly string[]): Promise<ReadonlyMap<string, string>> {
  if (ids.length === 0) return new Map()
  const found = await context.payload.find({
    collection: 'organizations',
    where: { id: { in: [...ids] } },
    limit: ids.length,
    depth: 0,
    pagination: false,
    overrideAccess: false,
    user: context.req.user,
    req: context.req,
  })
  return new Map(found.docs.map((doc) => [doc.id, doc.name]))
}

/** One page of documents, newest first, with company names; `kind` narrows it to quotes or invoices, `organizationId` to one client. */
export async function loadBillingPage(
  context: RequestContext,
  input: Readonly<{ kind: DocumentKind | undefined; page: number; organizationId?: string }>,
): Promise<BillingPage> {
  const clauses: Where[] = [
    ...(input.kind === undefined ? [] : [{ kind: { equals: input.kind } }]),
    ...(input.organizationId === undefined ? [] : [{ organization: { equals: input.organizationId } }]),
  ]
  const where: Where = clauses.length === 0 ? {} : { and: clauses }
  const found = await listBillingPage(context.req, { where, page: input.page, limit: BILLING_PAGE_SIZE })
  const names = await companyNames(context, [...new Set(found.records.map((record) => record.organizationId))])
  const now = Date.now()
  const rows = found.records.map((record) => ({
    id: record.id,
    number: record.number,
    kind: record.kind,
    shown: shownStatus(record, now),
    company: names.get(record.organizationId) ?? '',
    totalMinor: record.totalMinor,
    currency: record.currency,
    dueAt: record.dueAt,
  }))
  return { rows, total: found.total, page: input.page }
}

/** What a client owes: sent invoices not yet paid, per currency, and how many of them are past due. */
export interface Outstanding {
  readonly count: number
  readonly overdue: number
  readonly amounts: readonly Readonly<{ currency: string; minor: number }>[]
}

/** The most unpaid invoices counted for one client; a client with more than this owes more than it shows. */
const OUTSTANDING_LIMIT = 100

/** One client's unpaid invoices, totalled per currency. */
export async function loadClientOutstanding(context: RequestContext, organizationId: string): Promise<Outstanding> {
  const where: Where = {
    and: [
      { organization: { equals: organizationId } },
      { kind: { equals: 'invoice' } },
      { status: { equals: 'sent' } },
    ],
  }
  const found = await listBillingPage(context.req, { where, page: 1, limit: OUTSTANDING_LIMIT })
  const now = Date.now()
  const totals = new Map<string, number>()
  for (const record of found.records) {
    totals.set(record.currency, (totals.get(record.currency) ?? 0) + record.totalMinor)
  }
  return {
    count: found.records.length,
    overdue: found.records.filter((record) => isOverdue(record, now)).length,
    amounts: [...totals].map(([currency, minor]) => ({ currency, minor })),
  }
}

/** The name of one company the viewer may read, or an empty string. */
export async function loadCompanyName(context: RequestContext, id: string): Promise<string> {
  return (await companyNames(context, [id])).get(id) ?? ''
}

/** The currency of a client's latest quote or invoice, so the next one starts in it; `undefined` for a new client. */
export async function loadClientCurrency(context: RequestContext, organizationId: string): Promise<string | undefined> {
  const found = await listBillingPage(context.req, {
    where: { organization: { equals: organizationId } },
    page: 1,
    limit: 1,
  })
  return found.records[0]?.currency
}

export interface BillingView {
  readonly document: BillingDocument
  readonly shown: string
  readonly company: string
  readonly contact: string
  /** The contact's email, or '' when there is no contact or no email. */
  readonly contactEmail: string
  readonly sourceNumber: string
}

/** One document with the names it points at; `undefined` when it does not exist or the person may not see it. */
export async function loadBillingView(context: RequestContext, id: string): Promise<BillingView | undefined> {
  const deps = await billingDeps(context)
  const document = await deps.repo.get(asId(id))
  if (document === undefined) return undefined
  const [names, source] = await Promise.all([
    companyNames(context, [document.organizationId]),
    document.sourceQuoteId === null ? undefined : deps.repo.get(document.sourceQuoteId),
  ])
  return {
    document,
    shown: shownStatus(document, Date.now()),
    company: names.get(document.organizationId) ?? '',
    ...(await contactFields(context, document.contactId)),
    sourceNumber: source?.number ?? '',
  }
}

/** The contact's name and email for a document; both are '' when it has no contact. */
async function contactFields(context: RequestContext, contactId: string | null) {
  const contact = contactId === null ? undefined : await contactOf(context, contactId)
  return { contact: contact?.name ?? '', contactEmail: contact?.email ?? '' }
}

/** The name and email of one contact, read in a single query; both are '' when it cannot be read. */
async function contactOf(context: RequestContext, id: string): Promise<Readonly<{ name: string; email: string }>> {
  const doc = await context.payload
    .findByID({ collection: 'contacts', id, depth: 0, overrideAccess: false, user: context.req.user, req: context.req })
    .catch(() => undefined)
  if (doc === undefined) return { name: '', email: '' }
  return { name: [doc.firstName, doc.lastName].filter(Boolean).join(' '), email: doc.email ?? '' }
}
