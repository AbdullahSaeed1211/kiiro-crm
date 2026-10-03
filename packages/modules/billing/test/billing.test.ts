import { asId, systemClock, type Id } from '@ops/kernel'
import { describe, expect, it } from 'vitest'
import {
  changeDocumentStatus,
  computeTotals,
  createDocument,
  invoiceFromQuote,
  isOverdue,
  updateDocument,
  type BillingDeps,
  type BillingDocument,
  type BillingRepository,
} from '../src'
import { formatNumber } from '../src'

function memoryRepo(): BillingRepository {
  const store = new Map<Id, BillingDocument>()
  const counters = { quote: 0, invoice: 0 }
  return {
    get: (id) => Promise.resolve(store.get(id)),
    create: (input) => {
      counters[input.kind] += 1
      const id = asId(`doc-${String(store.size + 1)}`)
      const document: BillingDocument = {
        ...input,
        id,
        number: formatNumber(input.kind, counters[input.kind]),
        status: 'draft',
        sentAt: null,
        decidedAt: null,
        paidAt: null,
        createdAt: 1,
        updatedAt: 1,
      }
      store.set(id, document)
      return Promise.resolve(document)
    },
    update: ({ id, expectedUpdatedAt, change }) => {
      const current = store.get(id)
      if (current?.updatedAt !== expectedUpdatedAt) return Promise.resolve(undefined)
      const next = { ...current, ...change, updatedAt: current.updatedAt + 1 } as BillingDocument
      store.set(id, next)
      return Promise.resolve(next)
    },
    organizationVisible: (id) => Promise.resolve(id === 'org-1'),
  }
}

const deps = (role: 'owner' | 'staff' = 'owner'): BillingDeps & { events: string[] } => {
  const events: string[] = []
  return {
    actor: { id: asId('user-1'), role, groupIds: [] },
    can: () => true,
    repo: memoryRepo(),
    clock: systemClock,
    audit: (event: { verb: string }) => {
      events.push(event.verb)
      return Promise.resolve()
    },
    events,
  } as unknown as BillingDeps & { events: string[] }
}

const line = { description: 'Design', quantityMilli: 1500, unitPriceMinor: 10_000, taxBps: 1800 }
const base = { kind: 'quote', organizationId: 'org-1', currency: 'inr', lines: [line] }

describe('billing totals', () => {
  it('sums line by line and rounds half up', () => {
    // 1.5 x 100.00 = 150.00 net; 18% tax = 27.00
    expect(computeTotals([line])).toEqual({ subtotalMinor: 15_000, taxMinor: 2700, totalMinor: 17_700 })
    // 0.333 x 1.00 = 0.33; 10% of 33 = 3.3 -> 3
    const odd = { description: 'x', quantityMilli: 333, unitPriceMinor: 100, taxBps: 1000 }
    expect(computeTotals([odd]).taxMinor).toBe(3)
  })
})

describe('billing commands: creation and editing', () => {
  it('numbers documents per kind and stores the currency in capitals', async () => {
    const d = deps()
    const quote = await createDocument(d, base)
    const invoice = await createDocument(d, { ...base, kind: 'invoice' })
    expect(quote.ok && quote.value.number).toBe('QUO-0001')
    expect(invoice.ok && invoice.value.number).toBe('INV-0001')
    expect(quote.ok && quote.value.currency).toBe('INR')
  })

  it('refuses staff and unknown companies', async () => {
    const staff = await createDocument(deps('staff'), base)
    expect(!staff.ok && staff.error.code).toBe('FORBIDDEN')
    const missing = await createDocument(deps(), { ...base, organizationId: 'org-9' })
    expect(!missing.ok && missing.error.code).toBe('NOT_FOUND')
  })

  it('only edits drafts, recomputes totals, and detects a stale version', async () => {
    const d = deps()
    const created = await createDocument(d, base)
    if (!created.ok) throw new Error('create failed')
    const two = { ...line, quantityMilli: 2000 }
    const edited = await updateDocument(d, { id: created.value.id, expectedUpdatedAt: 1, patch: { lines: [two] } })
    expect(edited.ok && edited.value.subtotalMinor).toBe(20_000)
    const stale = await updateDocument(d, { id: created.value.id, expectedUpdatedAt: 1, patch: { note: 'x' } })
    expect(!stale.ok && stale.error.code).toBe('CONFLICT')
    await changeDocumentStatus(d, { id: created.value.id, expectedUpdatedAt: 2, to: 'sent' })
    const locked = await updateDocument(d, { id: created.value.id, expectedUpdatedAt: 3, patch: { note: 'x' } })
    expect(!locked.ok && locked.error.code).toBe('CONFLICT')
  })
})

describe('billing commands: states', () => {
  it('walks a quote to an invoice and records each step', async () => {
    const d = deps()
    const quote = await createDocument(d, base)
    if (!quote.ok) throw new Error('create failed')
    const early = await invoiceFromQuote(d, { quoteId: quote.value.id })
    expect(!early.ok && early.error.code).toBe('CONFLICT')
    const sent = await changeDocumentStatus(d, { id: quote.value.id, expectedUpdatedAt: 1, to: 'sent' })
    const accepted = await changeDocumentStatus(d, { id: quote.value.id, expectedUpdatedAt: 2, to: 'accepted' })
    expect(sent.ok && accepted.ok).toBe(true)
    const invoice = await invoiceFromQuote(d, { quoteId: quote.value.id })
    expect(invoice.ok && invoice.value.totalMinor).toBe(17_700)
    expect(d.events).toEqual(['quote.created', 'quote.sent', 'quote.accepted', 'invoice.created'])
  })

  it('refuses moves a kind does not allow', async () => {
    const d = deps()
    const invoice = await createDocument(d, { ...base, kind: 'invoice' })
    if (!invoice.ok) throw new Error('create failed')
    const bad = await changeDocumentStatus(d, { id: invoice.value.id, expectedUpdatedAt: 1, to: 'paid' })
    expect(!bad.ok && bad.error.code).toBe('CONFLICT')
  })

  it('flags a sent invoice past its due time as overdue', () => {
    const doc = { kind: 'invoice', status: 'sent', dueAt: 10 } as const
    expect(isOverdue(doc, 11)).toBe(true)
    expect(isOverdue({ ...doc, status: 'paid' }, 11)).toBe(false)
  })
})
