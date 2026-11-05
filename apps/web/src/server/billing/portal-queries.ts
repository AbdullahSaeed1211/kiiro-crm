import { createPortalLinkStore } from '@ops/adapter-payload'
import { asId } from '@ops/kernel'
import { linkWorks, type PortalLink } from '@ops/module-billing'
import type { RequestContext } from '../container'

export interface PortalLinkRow {
  readonly id: string
  readonly email: string
  readonly state: 'active' | 'expired' | 'revoked'
  readonly expiresAt: number
  readonly lastOpenedAt: number | null
}

function stateOf(link: PortalLink, now: number): PortalLinkRow['state'] {
  if (link.revokedAt !== null) return 'revoked'
  return linkWorks(link, now) ? 'active' : 'expired'
}

export interface PortalRecipient {
  readonly id: string
  readonly name: string
  readonly email: string
}

/** The links sent for a client, newest first, and the client's contacts that can receive one (they have an email). */
export async function loadClientPortal(
  context: RequestContext,
  organizationId: string,
): Promise<{ readonly links: readonly PortalLinkRow[]; readonly recipients: readonly PortalRecipient[] }> {
  const now = Date.now()
  const [links, contacts] = await Promise.all([
    createPortalLinkStore(context.req).listForOrganization(asId(organizationId)),
    context.payload.find({
      collection: 'contacts',
      where: { and: [{ organization: { equals: organizationId } }, { email: { exists: true } }] },
      select: { firstName: true, lastName: true, email: true },
      sort: 'firstName',
      limit: 50,
      pagination: false,
      depth: 0,
      overrideAccess: false,
      user: context.req.user,
      req: context.req,
    }),
  ])
  return {
    links: links.map((link) => ({
      id: link.id,
      email: link.email,
      state: stateOf(link, now),
      expiresAt: link.expiresAt,
      lastOpenedAt: link.lastOpenedAt,
    })),
    recipients: contacts.docs.flatMap((doc) => {
      const email = typeof doc.email === 'string' ? doc.email.trim() : ''
      if (email === '') return []
      return [{ id: doc.id, name: [doc.firstName, doc.lastName].filter(Boolean).join(' '), email }]
    }),
  }
}
