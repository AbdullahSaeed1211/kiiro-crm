import type { DocumentLine, DocumentKind } from './schema'

export interface Totals {
  readonly subtotalMinor: number
  readonly taxMinor: number
  readonly totalMinor: number
}

/** Every state a document can be stored in. Overdue and expired are worked out from the dates, never stored. */
export type DocumentStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'paid' | 'void'

const MILLI = 1000
const BPS = 10_000

/** Divides and rounds half up, so a total never depends on floating-point error. */
function roundedDiv(numerator: number, denominator: number): number {
  return Math.floor((numerator * 2 + denominator) / (denominator * 2))
}

/** The price of one line before tax: quantity (in thousandths) times the unit price. */
export function lineNetMinor(line: DocumentLine): number {
  return roundedDiv(line.quantityMilli * line.unitPriceMinor, MILLI)
}

/** The tax on one line, rounded to a whole minor unit. */
export function lineTaxMinor(line: DocumentLine): number {
  return roundedDiv(lineNetMinor(line) * line.taxBps, BPS)
}

/** The subtotal, the tax and the total of a document, summed line by line so the lines always add up. */
export function computeTotals(lines: readonly DocumentLine[]): Totals {
  const subtotalMinor = lines.reduce((sum, line) => sum + lineNetMinor(line), 0)
  const taxMinor = lines.reduce((sum, line) => sum + lineTaxMinor(line), 0)
  return { subtotalMinor, taxMinor, totalMinor: subtotalMinor + taxMinor }
}

const QUOTE_NEXT: Readonly<Record<DocumentStatus, readonly DocumentStatus[]>> = {
  draft: ['sent', 'void'],
  sent: ['accepted', 'declined', 'void'],
  accepted: [],
  declined: [],
  paid: [],
  void: [],
}

const INVOICE_NEXT: Readonly<Record<DocumentStatus, readonly DocumentStatus[]>> = {
  draft: ['sent', 'void'],
  sent: ['paid', 'void'],
  accepted: [],
  declined: [],
  paid: [],
  void: [],
}

/** Whether a document of this kind may move from one state to another. */
export function canMove(kind: DocumentKind, from: DocumentStatus, to: DocumentStatus): boolean {
  return (kind === 'quote' ? QUOTE_NEXT : INVOICE_NEXT)[from].includes(to)
}

/** A sent invoice past its due time and not paid. */
export function isOverdue(
  document: { kind: DocumentKind; status: DocumentStatus; dueAt: number | null },
  now: number,
): boolean {
  return document.kind === 'invoice' && document.status === 'sent' && document.dueAt !== null && document.dueAt < now
}

/** A sent quote past its valid-until time. */
export function isExpired(
  document: { kind: DocumentKind; status: DocumentStatus; dueAt: number | null },
  now: number,
): boolean {
  return document.kind === 'quote' && document.status === 'sent' && document.dueAt !== null && document.dueAt < now
}

/** The number a document shows: a prefix by kind and a counter padded to four digits. */
export function formatNumber(kind: DocumentKind, counter: number): string {
  return `${kind === 'quote' ? 'QUO' : 'INV'}-${String(counter).padStart(4, '0')}`
}
