import {
  createInvitationToken,
  createPortalLinkStore,
  createPortalReader,
  decideAsSystem,
  hashInvitationToken,
} from '@ops/adapter-payload'
import { asId, systemClock } from '@ops/kernel'
import type { BillingAuditEvent, PortalContact, PortalPublicDeps, PortalStaffDeps } from '@ops/module-billing'
import { createLocalReq, type PayloadRequest } from 'payload'
import { recordAuditEvent } from '../audit/record'
import { payloadForAuth } from '../auth/api'
import { getRequestContext, type RequestContext } from '../container'

/** Portal tokens use the same random 256-bit format and SHA-256 hash as invitations. */
const tokens = {
  newToken: async () => {
    const token = createInvitationToken()
    return { token, tokenHash: await hashInvitationToken(token) }
  },
  hash: hashInvitationToken,
}

/** A contact the staff member may see, with the company and email a link needs. */
async function visibleContact(context: RequestContext, id: string): Promise<PortalContact | undefined> {
  const found = await context.payload.find({
    collection: 'contacts',
    where: { id: { equals: id } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user: context.req.user,
    req: context.req,
  })
  const doc = found.docs.at(0)
  if (doc === undefined) return undefined
  const organization = typeof doc.organization === 'string' ? doc.organization : (doc.organization?.id ?? null)
  return {
    id: asId(doc.id),
    organizationId: organization === null ? null : asId(organization),
    email: typeof doc.email === 'string' ? doc.email.trim() : '',
    name: [doc.firstName, doc.lastName].filter(Boolean).join(' '),
  }
}

/** Sending, listing and revoking links, as the signed-in staff member. */
export async function portalStaffDeps(requestContext?: RequestContext): Promise<PortalStaffDeps> {
  const context = requestContext ?? (await getRequestContext())
  return {
    actor: context.actor,
    links: createPortalLinkStore(context.req),
    visibleContact: (id) => visibleContact(context, id),
    tokens,
    clock: systemClock,
    audit: (event) => recordAuditEvent(context, event),
  }
}

/** A security-log row with no staff actor: the client acted through their link. */
async function auditAsClient(req: PayloadRequest, event: BillingAuditEvent): Promise<void> {
  await req.payload.create({
    collection: 'auditEvents',
    data: { verb: event.verb, summary: event.summary, data: event.data ?? {}, occurredAt: Date.now() },
    overrideAccess: true,
    req,
  })
}

/** The client's side of the portal: no session, only the token in the address. */
export async function portalPublicDeps(): Promise<PortalPublicDeps> {
  const payload = await payloadForAuth()
  const req = await createLocalReq({ context: { authOperation: 'portal' } }, payload)
  return {
    links: createPortalLinkStore(req),
    reader: createPortalReader(req),
    decide: (document, change) => decideAsSystem(req, document, change),
    tokens: { hash: hashInvitationToken },
    clock: systemClock,
    audit: (event) => auditAsClient(req, event),
  }
}
