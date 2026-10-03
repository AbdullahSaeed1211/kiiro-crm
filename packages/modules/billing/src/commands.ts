import { asId, domainError, err, ok, type Id } from '@ops/kernel'
import { isManagerUp } from '@ops/platform'
import type { ZodType, z } from 'zod'
import { canMove, computeTotals, type DocumentStatus } from './domain'
import type { BillingDeps, BillingDocument, BillingResult, DocumentChange } from './ports'
import { createDocumentSchema, invoiceFromQuoteSchema, statusChangeSchema, updateDocumentSchema } from './schema'

const fail = <T>(code: Parameters<typeof domainError>[0], message: string): BillingResult<T> =>
  err(domainError(code, message))

/** Parses input with a schema, or returns the failed result to hand back. */
function parse<T>(schema: ZodType<T>, input: unknown, message: string): T | BillingResult<never> {
  const parsed = schema.safeParse(input)
  return parsed.success ? parsed.data : fail('VALIDATION', message)
}

const isFailure = (value: unknown): value is BillingResult<never> =>
  typeof value === 'object' && value !== null && 'ok' in value && value.ok === false

const idOrNull = (value: string | null | undefined): Id | null =>
  value === undefined || value === null ? null : asId(value)

async function load(deps: BillingDeps, id: string): Promise<BillingDocument | undefined> {
  return deps.repo.get(asId(id))
}

/** Creates a draft quote or invoice. Only owners and managers may bill. */
export async function createDocument(deps: BillingDeps, input: unknown): Promise<BillingResult<BillingDocument>> {
  if (!isManagerUp(deps.actor)) return fail('FORBIDDEN', 'Only owners and managers can create quotes and invoices.')
  const data = parse(createDocumentSchema, input, 'Check the document: it needs a company and at least one line.')
  if (isFailure(data)) return data
  if (!(await deps.repo.organizationVisible(asId(data.organizationId)))) return fail('NOT_FOUND', 'Company not found.')
  const created = await deps.repo.create({
    kind: data.kind,
    organizationId: asId(data.organizationId),
    dealId: idOrNull(data.dealId),
    contactId: idOrNull(data.contactId),
    currency: data.currency,
    lines: data.lines,
    note: data.note ?? null,
    dueAt: data.dueAt ?? null,
    paymentLink: data.paymentLink ?? null,
    sourceQuoteId: null,
    createdById: deps.actor.id,
    ...computeTotals(data.lines),
  })
  await deps.audit({ verb: `${data.kind}.created`, summary: created.number })
  return ok(created)
}

type Patch = z.infer<typeof updateDocumentSchema>['patch']

/** The stored fields a patch sets; totals follow the lines. */
function changeFrom(patch: Patch): DocumentChange {
  const { lines, contactId, ...plain } = patch
  const defined = Object.fromEntries(Object.entries(plain).filter(([, value]) => value !== undefined))
  return {
    ...defined,
    ...(lines === undefined ? {} : { lines, ...computeTotals(lines) }),
    ...(contactId === undefined ? {} : { contactId: idOrNull(contactId) }),
  }
}

/** Edits a draft. A document that has been sent is fixed; void it and make a new one. */
export async function updateDocument(deps: BillingDeps, input: unknown): Promise<BillingResult<BillingDocument>> {
  if (!isManagerUp(deps.actor)) return fail('FORBIDDEN', 'Only owners and managers can edit quotes and invoices.')
  const data = parse(updateDocumentSchema, input, 'Check the changes and try again.')
  if (isFailure(data)) return data
  const current = await load(deps, data.id)
  if (current === undefined) return fail('NOT_FOUND', 'Document not found.')
  if (current.status !== 'draft') return fail('CONFLICT', 'Only a draft can be edited.')
  const change = changeFrom(data.patch)
  const saved = await deps.repo.update({ id: current.id, expectedUpdatedAt: data.expectedUpdatedAt, change })
  return saved === undefined ? fail('CONFLICT', 'Someone else changed this document. Reload and try again.') : ok(saved)
}

function stampFor(to: DocumentStatus, now: number): DocumentChange {
  if (to === 'sent') return { status: to, sentAt: now }
  if (to === 'paid') return { status: to, paidAt: now }
  if (to === 'accepted' || to === 'declined') return { status: to, decidedAt: now }
  return { status: to }
}

/** Moves a document to its next state, and refuses a move its kind does not allow. */
export async function changeDocumentStatus(deps: BillingDeps, input: unknown): Promise<BillingResult<BillingDocument>> {
  if (!isManagerUp(deps.actor)) return fail('FORBIDDEN', 'Only owners and managers can change a document.')
  const data = parse(statusChangeSchema, input, 'Choose a document and a new state.')
  if (isFailure(data)) return data
  const current = await load(deps, data.id)
  if (current === undefined) return fail('NOT_FOUND', 'Document not found.')
  if (!canMove(current.kind, current.status, data.to)) {
    return fail('CONFLICT', `A ${current.kind} that is ${current.status} cannot become ${data.to}.`)
  }
  const saved = await deps.repo.update({
    id: current.id,
    expectedUpdatedAt: data.expectedUpdatedAt,
    change: stampFor(data.to, deps.clock.now()),
  })
  if (saved === undefined) return fail('CONFLICT', 'Someone else changed this document. Reload and try again.')
  await deps.audit({ verb: `${current.kind}.${data.to}`, summary: current.number })
  return ok(saved)
}

/** Copies an accepted quote into a draft invoice with the same lines, company and currency. */
export async function invoiceFromQuote(deps: BillingDeps, input: unknown): Promise<BillingResult<BillingDocument>> {
  if (!isManagerUp(deps.actor)) return fail('FORBIDDEN', 'Only owners and managers can create invoices.')
  const data = parse(invoiceFromQuoteSchema, input, 'Choose a quote.')
  if (isFailure(data)) return data
  const quote = await load(deps, data.quoteId)
  if (quote?.kind !== 'quote') return fail('NOT_FOUND', 'Quote not found.')
  if (quote.status !== 'accepted') return fail('CONFLICT', 'Only an accepted quote can become an invoice.')
  const invoice = await deps.repo.create({
    kind: 'invoice',
    organizationId: quote.organizationId,
    dealId: quote.dealId,
    contactId: quote.contactId,
    currency: quote.currency,
    lines: quote.lines,
    note: quote.note,
    dueAt: data.dueAt ?? null,
    paymentLink: null,
    sourceQuoteId: quote.id,
    createdById: deps.actor.id,
    subtotalMinor: quote.subtotalMinor,
    taxMinor: quote.taxMinor,
    totalMinor: quote.totalMinor,
  })
  await deps.audit({ verb: 'invoice.created', summary: `${invoice.number} from ${quote.number}` })
  return ok(invoice)
}
