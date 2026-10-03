import { listBillingPage } from '@ops/adapter-payload'
import { asId } from '@ops/kernel'
import { isExpired, isOverdue, type BillingDocument, type DocumentKind } from '@ops/module-billing'
import type { Where } from 'payload'
import type { RequestContext } from '../container'
import { billingDeps } from './deps'

export const BILLING_PAGE_SIZE = 25

export interface BillingRow {
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
export function shownStatus(document: Pick<BillingDocument, 'kind' | 'status' | 'dueAt'>, now: number): string {
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

/** One page of documents, newest first, with company names; `kind` narrows it to quotes or invoices. */
export async function loadBillingPage(
  context: RequestContext,
  input: Readonly<{ kind: DocumentKind | undefined; page: number }>,
): Promise<BillingPage> {
  const where: Where = input.kind === undefined ? {} : { kind: { equals: input.kind } }
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

export interface BillingView {
  readonly document: BillingDocument
  readonly shown: string
  readonly company: string
  readonly contact: string
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
    contact: document.contactId === null ? '' : await contactName(context, document.contactId),
    sourceNumber: source?.number ?? '',
  }
}

async function contactName(context: RequestContext, id: string): Promise<string> {
  const doc = await context.payload
    .findByID({ collection: 'contacts', id, depth: 0, overrideAccess: false, user: context.req.user, req: context.req })
    .catch(() => undefined)
  return doc === undefined ? '' : [doc.firstName, doc.lastName].filter(Boolean).join(' ')
}
