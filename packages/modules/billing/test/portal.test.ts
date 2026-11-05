import { asId, type Id } from '@ops/kernel'
import { describe, expect, it } from 'vitest'
import {
  decideQuote,
  issuePortalLink,
  openPortal,
  PORTAL_INVALID,
  revokePortalLink,
  type BillingDocument,
  type PortalContact,
  type PortalLink,
  type PortalLinkStore,
  type PortalPublicDeps,
  type PortalStaffDeps,
} from '../src'

const DAY = 86_400_000

function memoryLinks(): PortalLinkStore & { all: PortalLink[] } {
  const all: PortalLink[] = []
  const patch = (linkId: Id, change: Partial<PortalLink>) => {
    const index = all.findIndex((link) => link.id === linkId)
    const current = all[index]
    if (current !== undefined) all[index] = { ...current, ...change }
    return Promise.resolve()
  }
  return {
    all,
    create: (input) => {
      const link = {
        ...input,
        id: asId(`link-${String(all.length + 1)}`),
        revokedAt: null,
        lastOpenedAt: null,
        createdAt: 0,
      }
      all.push(link)
      return Promise.resolve(link)
    },
    get: (linkId) => Promise.resolve(all.find((link) => link.id === linkId)),
    findByTokenHash: (hash) => Promise.resolve(all.find((link) => link.tokenHash === hash)),
    listForOrganization: (orgId) => Promise.resolve(all.filter((link) => link.organizationId === orgId)),
    markRevoked: (linkId, at) => patch(linkId, { revokedAt: at }),
    markOpened: (linkId, at) => patch(linkId, { lastOpenedAt: at }),
  }
}

function doc(input: Partial<BillingDocument> & Pick<BillingDocument, 'id' | 'kind' | 'status'>): BillingDocument {
  return {
    number: input.id,
    organizationId: asId('org-1'),
    dealId: null,
    contactId: null,
    currency: 'USD',
    lines: [],
    note: null,
    dueAt: null,
    paymentLink: null,
    sourceQuoteId: null,
    sentAt: null,
    decidedAt: null,
    paidAt: null,
    createdById: asId('user-1'),
    createdAt: 0,
    updatedAt: 1,
    subtotalMinor: 0,
    taxMinor: 0,
    totalMinor: 0,
    ...input,
  }
}

const CONTACTS: Record<string, PortalContact> = {
  'contact-1': { id: asId('contact-1'), organizationId: asId('org-1'), email: 'jo@client.test', name: 'Jo' },
  'contact-2': { id: asId('contact-2'), organizationId: null, email: 'free@client.test', name: 'Free' },
}

/** A token is its own hash here, so tests can pass a known token; real tokens are 64 hex characters either way. */
const TOKEN = 'a'.repeat(64)

function seedDocuments(now: number): BillingDocument[] {
  return [
    doc({ id: asId('q-sent'), kind: 'quote', status: 'sent' }),
    doc({ id: asId('q-draft'), kind: 'quote', status: 'draft' }),
    doc({ id: asId('i-sent'), kind: 'invoice', status: 'sent' }),
    doc({ id: asId('i-void'), kind: 'invoice', status: 'void' }),
    doc({ id: asId('q-other'), kind: 'quote', status: 'sent', organizationId: asId('org-2') }),
    doc({ id: asId('q-expired'), kind: 'quote', status: 'sent', dueAt: now - 1 }),
  ]
}

/** Compare-and-set on `updatedAt`, as the system write does. */
function memoryDecide(documents: BillingDocument[]): PortalPublicDeps['decide'] {
  return (document, change) => {
    const index = documents.findIndex((entry) => entry.id === document.id)
    const current = documents[index]
    if (current?.updatedAt !== document.updatedAt) return Promise.resolve(undefined)
    const next = { ...current, ...change, updatedAt: current.updatedAt + 1 } as BillingDocument
    documents[index] = next
    return Promise.resolve(next)
  }
}

type Shared = Pick<PortalStaffDeps, 'links' | 'clock' | 'audit'>

function staffDeps(shared: Shared, role: 'owner' | 'staff' = 'owner'): PortalStaffDeps {
  return {
    ...shared,
    actor: { id: asId('user-1'), role, groupIds: [], reportIds: [], active: true },
    visibleContact: (contactId) => Promise.resolve(CONTACTS[contactId]),
    tokens: { newToken: () => Promise.resolve({ token: TOKEN, tokenHash: TOKEN }), hash: (t) => Promise.resolve(t) },
  }
}

function clientDeps(shared: Shared, documents: BillingDocument[]): PortalPublicDeps {
  return {
    ...shared,
    reader: {
      organizationName: (orgId) => Promise.resolve(orgId === 'org-1' ? 'Client Co' : 'Other Co'),
      // A reader that ignores the organization, so the use case's own filter is what is tested.
      documents: () => Promise.resolve(documents),
      projects: () => Promise.resolve([]),
    },
    decide: memoryDecide(documents),
    tokens: { hash: (t) => Promise.resolve(t) },
  }
}

function setup(now = 10 * DAY) {
  const links = memoryLinks()
  const documents = seedDocuments(now)
  const events: string[] = []
  const shared: Shared = {
    links,
    clock: { now: () => now },
    audit: (event) => {
      events.push(event.verb)
      return Promise.resolve()
    },
  }
  return {
    links,
    events,
    staff: (role?: 'owner' | 'staff') => staffDeps(shared, role),
    client: clientDeps(shared, documents),
  }
}

describe('client portal links', () => {
  it('shows one company its sent documents only: no drafts, no voids, nothing of another company', async () => {
    const { staff, client } = setup()
    expect((await issuePortalLink(staff(), { contactId: 'contact-1' })).ok).toBe(true)
    const view = await openPortal(client, TOKEN)
    if (!view.ok) throw new Error('expected the portal to open')
    expect(view.value.quotes.map((quote) => quote.id).sort((a, b) => a.localeCompare(b))).toEqual([
      'q-expired',
      'q-sent',
    ])
    expect(view.value.invoices.map((invoice) => invoice.id)).toEqual(['i-sent'])
  })

  it('answers wrong, revoked and expired links the same way', async () => {
    const { staff, client, links } = setup()
    await issuePortalLink(staff(), { contactId: 'contact-1' })
    const wrong = await openPortal(client, 'b'.repeat(64))
    const malformed = await openPortal(client, 'not-a-token')
    await revokePortalLink(staff(), { id: links.all[0]?.id })
    const revoked = await openPortal(client, TOKEN)
    const expired = await openPortal({ ...client, clock: { now: () => 100 * DAY } }, TOKEN)
    for (const result of [wrong, malformed, revoked, expired]) {
      expect(result.ok ? null : result.error.message).toBe(PORTAL_INVALID)
    }
  })

  it('lets only owners and managers send links, and only to a contact with a company and email', async () => {
    const { staff } = setup()
    expect((await issuePortalLink(staff('staff'), { contactId: 'contact-1' })).ok).toBe(false)
    const orphan = await issuePortalLink(staff(), { contactId: 'contact-2' })
    expect(orphan.ok ? null : orphan.error.code).toBe('VALIDATION')
  })
})

describe('client portal quote answers', () => {
  it('accepts a sent quote once', async () => {
    const { staff, client, events } = setup()
    await issuePortalLink(staff(), { contactId: 'contact-1' })
    const accepted = await decideQuote(client, { token: TOKEN, quoteId: 'q-sent', decision: 'accept' })
    expect(accepted.ok ? accepted.value.status : null).toBe('accepted')
    expect(events).toContain('quote.accepted')
    const again = await decideQuote(client, { token: TOKEN, quoteId: 'q-sent', decision: 'decline' })
    expect(again.ok ? null : again.error.code).toBe('CONFLICT')
  })

  it("refuses drafts, expired quotes and another company's quote", async () => {
    const { staff, client } = setup()
    await issuePortalLink(staff(), { contactId: 'contact-1' })
    for (const quoteId of ['q-draft', 'q-expired']) {
      expect((await decideQuote(client, { token: TOKEN, quoteId, decision: 'accept' })).ok).toBe(false)
    }
    const other = await decideQuote(client, { token: TOKEN, quoteId: 'q-other', decision: 'accept' })
    expect(other.ok ? null : other.error.code).toBe('NOT_FOUND')
  })
})
