import { asId, domainError, err, ok, type Id } from '@ops/kernel'
import { isManagerUp } from '@ops/platform'
import { z } from 'zod'
import { isExpired } from './domain'
import type { BillingDocument, BillingResult } from './ports'
import type { PortalLink, PortalPublicDeps, PortalStaffDeps, PortalView } from './portal-ports'

/** How long a portal link works before staff send a new one. */
export const PORTAL_LINK_DAYS = 30
const DAY_MS = 86_400_000

/** The one answer for a wrong, expired or revoked link, so the portal never says which it was. */
export const PORTAL_INVALID = 'This link no longer works. Ask for a new one.'

const fail = <T>(code: Parameters<typeof domainError>[0], message: string): BillingResult<T> =>
  err(domainError(code, message))

const id = z.string().trim().min(1).max(64)
const token = z
  .string()
  .regex(/^[a-f0-9]{64}$/u)
  .readonly()
export const issuePortalLinkSchema = z.object({ contactId: id }).strict()
export const revokePortalLinkSchema = z.object({ id }).strict()
export const decideQuoteSchema = z.object({ token, quoteId: id, decision: z.enum(['accept', 'decline']) }).strict()

/** Sends a new link to a client contact. The token is returned once, to email or copy; only its hash is kept. */
export async function issuePortalLink(
  deps: PortalStaffDeps,
  input: unknown,
): Promise<BillingResult<{ readonly link: PortalLink; readonly token: string }>> {
  if (!isManagerUp(deps.actor)) return fail('FORBIDDEN', 'Only owners and managers can share the client portal.')
  const parsed = issuePortalLinkSchema.safeParse(input)
  if (!parsed.success) return fail('VALIDATION', 'Choose a contact.')
  const contact = await deps.visibleContact(asId(parsed.data.contactId))
  if (contact === undefined) return fail('NOT_FOUND', 'Contact not found.')
  if (contact.organizationId === null) return fail('VALIDATION', 'Add this contact to a company first.')
  if (contact.email === '') return fail('VALIDATION', 'Add an email address to this contact first.')
  const { token: secret, tokenHash } = await deps.tokens.newToken()
  const link = await deps.links.create({
    organizationId: contact.organizationId,
    contactId: contact.id,
    email: contact.email,
    tokenHash,
    expiresAt: deps.clock.now() + PORTAL_LINK_DAYS * DAY_MS,
    createdById: deps.actor.id,
  })
  await deps.audit({
    verb: 'portal.link_sent',
    summary: contact.email,
    data: { organizationId: contact.organizationId },
  })
  return ok({ link, token: secret })
}

/** Stops a link from working at once. */
export async function revokePortalLink(deps: PortalStaffDeps, input: unknown): Promise<BillingResult<PortalLink>> {
  if (!isManagerUp(deps.actor)) return fail('FORBIDDEN', 'Only owners and managers can revoke portal links.')
  const parsed = revokePortalLinkSchema.safeParse(input)
  if (!parsed.success) return fail('VALIDATION', 'Choose a link.')
  const link = await deps.links.get(asId(parsed.data.id))
  if (link === undefined) return fail('NOT_FOUND', 'Link not found.')
  if (link.revokedAt !== null) return ok(link)
  const at = deps.clock.now()
  await deps.links.markRevoked(link.id, at)
  await deps.audit({ verb: 'portal.link_revoked', summary: link.email, data: { organizationId: link.organizationId } })
  return ok({ ...link, revokedAt: at })
}

/** Whether a link still opens the portal. */
export function linkWorks(link: Pick<PortalLink, 'revokedAt' | 'expiresAt'>, now: number): boolean {
  return link.revokedAt === null && link.expiresAt > now
}

async function liveLink(deps: PortalPublicDeps, secret: string): Promise<PortalLink | undefined> {
  if (!token.safeParse(secret).success) return undefined
  const link = await deps.links.findByTokenHash(await deps.tokens.hash(secret))
  return link !== undefined && linkWorks(link, deps.clock.now()) ? link : undefined
}

/** Drafts and voided documents stay internal; the client sees what was sent to them. */
const shown = (document: BillingDocument): boolean => document.status !== 'draft' && document.status !== 'void'

/** Everything one link may see: its company's sent quotes and invoices, and its projects' progress. */
export async function openPortal(deps: PortalPublicDeps, secret: string): Promise<BillingResult<PortalView>> {
  const link = await liveLink(deps, secret)
  if (link === undefined) return fail('NOT_FOUND', PORTAL_INVALID)
  const [organizationName, documents, projects] = await Promise.all([
    deps.reader.organizationName(link.organizationId),
    deps.reader.documents(link.organizationId),
    deps.reader.projects(link.organizationId),
    // The open timestamp is telemetry; a write failure must not hide the documents the client came to read.
    deps.links.markOpened(link.id, deps.clock.now()).catch(() => undefined),
  ])
  if (organizationName === undefined) return fail('NOT_FOUND', PORTAL_INVALID)
  const visible = documents.filter((document) => document.organizationId === link.organizationId && shown(document))
  return ok({
    link,
    organizationName,
    quotes: visible.filter((document) => document.kind === 'quote'),
    invoices: visible.filter((document) => document.kind === 'invoice'),
    projects,
  })
}

async function quoteFor(deps: PortalPublicDeps, link: PortalLink, quoteId: Id): Promise<BillingDocument | undefined> {
  const documents = await deps.reader.documents(link.organizationId)
  return documents.find(
    (document) =>
      document.id === quoteId && document.kind === 'quote' && document.organizationId === link.organizationId,
  )
}

/** The client accepts or declines a sent quote that has not expired. */
export async function decideQuote(deps: PortalPublicDeps, input: unknown): Promise<BillingResult<BillingDocument>> {
  const parsed = decideQuoteSchema.safeParse(input)
  if (!parsed.success) return fail('NOT_FOUND', PORTAL_INVALID)
  const link = await liveLink(deps, parsed.data.token)
  if (link === undefined) return fail('NOT_FOUND', PORTAL_INVALID)
  const quote = await quoteFor(deps, link, asId(parsed.data.quoteId))
  if (quote === undefined) return fail('NOT_FOUND', 'Quote not found.')
  const now = deps.clock.now()
  if (quote.status !== 'sent' || isExpired(quote, now)) return fail('CONFLICT', 'This quote can no longer be answered.')
  const status = parsed.data.decision === 'accept' ? 'accepted' : 'declined'
  const saved = await deps.decide(quote, { status, decidedAt: now })
  if (saved === undefined) return fail('CONFLICT', 'This quote changed. Reload the page and try again.')
  await deps.audit({
    verb: `quote.${status}`,
    summary: `${quote.number} by ${link.email} in the client portal`,
    data: { organizationId: link.organizationId, portalLinkId: link.id },
  })
  return ok(saved)
}
