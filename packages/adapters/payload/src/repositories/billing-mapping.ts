import { asId, type Id } from '@ops/kernel'
import type { BillingDocument, DocumentStatus } from '@ops/module-billing'
import { fieldOf, idOf, msOf, numberOf, textOf, type Doc } from './documents'

const STATUSES: readonly string[] = ['draft', 'sent', 'accepted', 'declined', 'paid', 'void']

/** Reads the stored line list; a malformed value becomes an empty list rather than a crash. */
function linesOf(doc: Doc): BillingDocument['lines'] {
  const value = fieldOf(doc, 'lines')
  return Array.isArray(value) ? (value as BillingDocument['lines']) : []
}

const timeOrNull = (doc: Doc, key: string): number | null => numberOf(doc, key)

const link = (doc: Doc, key: string): Id | null => idOf(fieldOf(doc, key)) ?? null
const text = (doc: Doc, key: string): string | null => textOf(doc, key) ?? null
const minor = (doc: Doc, key: string): number => numberOf(doc, key) ?? 0

type Details = Omit<BillingDocument, 'id' | 'kind' | 'organizationId' | 'status' | 'createdById'>

/** The links, text and lines of a stored document. */
function contentOf(
  doc: Doc,
): Pick<Details, 'number' | 'dealId' | 'contactId' | 'currency' | 'lines' | 'note' | 'paymentLink' | 'sourceQuoteId'> {
  return {
    number: textOf(doc, 'number') ?? '',
    dealId: link(doc, 'deal'),
    contactId: link(doc, 'contact'),
    currency: textOf(doc, 'currency') ?? '',
    lines: linesOf(doc),
    note: text(doc, 'note'),
    paymentLink: text(doc, 'paymentLink'),
    sourceQuoteId: link(doc, 'sourceQuoteId'),
  }
}

/** The times and amounts of a stored document. */
function figuresOf(
  doc: Doc,
): Pick<
  Details,
  'dueAt' | 'sentAt' | 'decidedAt' | 'paidAt' | 'subtotalMinor' | 'taxMinor' | 'totalMinor' | 'createdAt' | 'updatedAt'
> {
  return {
    dueAt: timeOrNull(doc, 'dueAt'),
    sentAt: timeOrNull(doc, 'sentAt'),
    decidedAt: timeOrNull(doc, 'decidedAt'),
    paidAt: timeOrNull(doc, 'paidAt'),
    subtotalMinor: minor(doc, 'subtotalMinor'),
    taxMinor: minor(doc, 'taxMinor'),
    totalMinor: minor(doc, 'totalMinor'),
    createdAt: msOf(fieldOf(doc, 'createdAt')) ?? 0,
    updatedAt: msOf(fieldOf(doc, 'updatedAt')) ?? 0,
  }
}

const isKind = (value: string | undefined): value is 'quote' | 'invoice' => value === 'quote' || value === 'invoice'
const isStatus = (value: string | undefined): value is DocumentStatus => value !== undefined && STATUSES.includes(value)

/** Maps a stored document to the module's record; `undefined` when a required field is missing. */
export function toBillingDocument(doc: Doc): BillingDocument | undefined {
  const id = idOf(fieldOf(doc, 'id'))
  const organizationId = idOf(fieldOf(doc, 'organization'))
  const kind = textOf(doc, 'kind')
  const status = textOf(doc, 'status')
  if (id === undefined || organizationId === undefined || !isKind(kind) || !isStatus(status)) return undefined
  return {
    ...contentOf(doc),
    ...figuresOf(doc),
    id,
    kind,
    organizationId,
    status,
    createdById: idOf(fieldOf(doc, 'createdBy')) ?? asId(''),
  }
}
