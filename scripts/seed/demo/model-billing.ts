import { need } from './need'
import type { Random } from './random'
import type { DemoContact, DemoDeal, DemoDocument, DemoDocumentLine, DemoProject } from './types'

const TAX_BPS = 825
const CLIENT_TAX_BPS = 0

function line(description: string, amountMinor: number, taxBps: number): DemoDocumentLine {
  // Quantity is in thousandths, so dividing the amount between two lines keeps whole minor units.
  return { description, quantityMilli: 1000, unitPriceMinor: amountMinor, taxBps }
}

/** Two lines that add up to the deal value: strategy and delivery. */
function linesFor(deal: DemoDeal): readonly DemoDocumentLine[] {
  const total = Math.max(deal.valueMajor * 100, 500)
  const strategy = Math.round(total * 0.4)
  const service = need(deal.serviceLines[0], 'a service line')
  return [
    line(`Strategy and planning: ${service}`, strategy, CLIENT_TAX_BPS),
    line(`Delivery: ${deal.title}`, total - strategy, TAX_BPS),
  ]
}

interface BillingInput {
  readonly random: Random
  readonly deals: readonly DemoDeal[]
  readonly projects: readonly DemoProject[]
  readonly contacts: readonly DemoContact[]
}

function contactFor(deal: DemoDeal, contacts: readonly DemoContact[]): string {
  return deal.contactKeys[0] ?? contacts.find((contact) => contact.orgKey === deal.orgKey)?.key ?? ''
}

interface DealDocInput {
  readonly random: Random
  readonly deal: DemoDeal
  readonly project: DemoProject
  readonly contactKey: string
}

function invoiceFor(input: DealDocInput, decidedDay: number): DemoDocument {
  const { random, deal, contactKey } = input
  const invoiceSent = decidedDay + random.int(1, 3)
  const paid = random.chance(0.62)
  return {
    key: `invoice:${deal.key}`,
    kind: 'invoice',
    orgKey: deal.orgKey,
    contactKey,
    dealKey: deal.key,
    status: paid ? 'paid' : 'sent',
    lines: linesFor(deal),
    note: `Invoice for ${deal.title}. Bank details are on the printed copy.`,
    createdDay: decidedDay,
    sentDay: invoiceSent,
    decidedDay: null,
    paidDay: paid ? Math.min(invoiceSent + random.int(2, 20), 0) : null,
    dueDay: invoiceSent + 14,
  }
}

/** The quote for a won deal and, once accepted, the invoice that follows it. */
function documentsForDeal(input: DealDocInput): DemoDocument[] {
  const { random, deal, project, contactKey } = input
  const createdDay = project.startDay - random.int(8, 18)
  const sentDay = createdDay + random.int(0, 2)
  const decision = random.weighted([
    ['accepted', 78],
    ['declined', 7],
    ['sent', 15],
  ] as const)
  const decidedDay = decision === 'accepted' || decision === 'declined' ? sentDay + random.int(1, 6) : null
  const quote: DemoDocument = {
    key: `quote:${deal.key}`,
    kind: 'quote',
    orgKey: deal.orgKey,
    contactKey,
    dealKey: deal.key,
    status: decision,
    lines: linesFor(deal),
    note: `Prepared for ${deal.title}. Prices hold for 30 days.`,
    createdDay,
    sentDay,
    decidedDay,
    paidDay: null,
    dueDay: sentDay + 30,
  }
  if (decision !== 'accepted' || decidedDay === null) return [quote]
  return [quote, invoiceFor(input, decidedDay)]
}

function wonDocuments(input: BillingInput): DemoDocument[] {
  const { random, contacts } = input
  const byOrg = new Map(input.projects.map((project) => [project.orgKey, project]))
  return input.deals.flatMap((deal) => {
    const project = byOrg.get(deal.orgKey)
    if (deal.path.at(-1)?.stage !== 'Won' || project === undefined || !random.chance(0.7)) return []
    const contactKey = contactFor(deal, contacts)
    return contactKey === '' ? [] : documentsForDeal({ random, deal, project, contactKey })
  })
}

/** Draft quotes for deals still in the pipeline, so the quote list has work in progress too. */
function draftQuotes(input: BillingInput): DemoDocument[] {
  const { random, contacts } = input
  const open = input.deals.filter((deal) => {
    const stage = deal.path.at(-1)?.stage
    return stage !== 'Won' && stage !== 'Lost'
  })
  return open.slice(0, 4).flatMap((deal) => {
    const contactKey = contactFor(deal, contacts)
    if (contactKey === '') return []
    return [
      {
        key: `draft:${deal.key}`,
        kind: 'quote' as const,
        orgKey: deal.orgKey,
        contactKey,
        dealKey: deal.key,
        status: 'draft' as const,
        lines: linesFor(deal),
        note: `Draft for ${deal.title}.`,
        createdDay: deal.createdDay + random.int(1, 5),
        sentDay: null,
        decidedDay: null,
        paidDay: null,
        dueDay: null,
      },
    ]
  })
}

/** Quotes and invoices for won deals, plus a few draft quotes still in the pipeline. */
export function makeDocuments(input: BillingInput): DemoDocument[] {
  return [...wonDocuments(input), ...draftQuotes(input)]
}
