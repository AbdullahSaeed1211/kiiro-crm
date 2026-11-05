import { COLLECTIONS, at, createDoc, idFor, type WriteContext } from './context'
import type { DemoDataset, DemoDocument, DemoDocumentLine } from './types'

const MILLI = 1000
const BPS = 10_000

function roundedDiv(numerator: number, denominator: number): number {
  return Math.floor((numerator * 2 + denominator) / (denominator * 2))
}

function totals(lines: readonly DemoDocumentLine[]) {
  const subtotalMinor = lines.reduce(
    (sum, line) => sum + roundedDiv(line.quantityMilli * line.unitPriceMinor, MILLI),
    0,
  )
  const taxMinor = lines.reduce(
    (sum, line) => sum + roundedDiv(roundedDiv(line.quantityMilli * line.unitPriceMinor, MILLI) * line.taxBps, BPS),
    0,
  )
  return { subtotalMinor, taxMinor, totalMinor: subtotalMinor + taxMinor }
}

function formatNumber(kind: DemoDocument['kind'], counter: number): string {
  return `${kind === 'quote' ? 'QUO' : 'INV'}-${String(counter).padStart(4, '0')}`
}

function stamp(context: WriteContext, day: number | null): number | null {
  return day === null ? null : at(context, day)
}

/** Quotes and invoices, numbered in the order they were made. */
export async function writeDocuments(
  context: WriteContext,
  input: { readonly data: DemoDataset; readonly currency: string },
): Promise<void> {
  const counters = { quote: 0, invoice: 0 }
  const quoteIds = new Map<string, string>()
  const ordered = [...input.data.documents].sort((left, right) => left.createdDay - right.createdDay)
  for (const document of ordered) {
    counters[document.kind] += 1
    const amounts = totals(document.lines)
    const id = await createDoc(context, {
      collection: COLLECTIONS.billingDocuments,
      key: document.key,
      day: document.createdDay,
      data: {
        kind: document.kind,
        number: formatNumber(document.kind, counters[document.kind]),
        status: document.status,
        organization: idFor(context, document.orgKey),
        deal: idFor(context, document.dealKey),
        contact: idFor(context, document.contactKey),
        currency: input.currency,
        lines: document.lines,
        note: document.note,
        dueAt: stamp(context, document.dueDay),
        paymentLink: null,
        sourceQuoteId: sourceQuote(document, quoteIds),
        ...amounts,
        sentAt: stamp(context, document.sentDay),
        decidedAt: stamp(context, document.decidedDay),
        paidAt: stamp(context, document.paidDay),
        createdBy: context.owner.id,
      },
    })
    if (document.kind === 'quote' && document.status === 'accepted') quoteIds.set(document.dealKey, id)
  }
}

/** An invoice made from an accepted quote points back at it; a draft quote points at nothing. */
function sourceQuote(document: DemoDocument, quoteIds: ReadonlyMap<string, string>): string | null {
  return document.kind === 'invoice' ? (quoteIds.get(document.dealKey) ?? null) : null
}
