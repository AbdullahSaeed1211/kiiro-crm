/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/no-unnecessary-condition, sonarjs/different-types-comparison -- the claim flow intentionally models Payload's atomic and variable-shaped responses. */
export interface InvitationClaimDocument extends Record<string, unknown> {
  readonly id: string | number
}

export interface InvitationClaimStore {
  find(options: Record<string, unknown>): Promise<{ docs: (InvitationClaimDocument | undefined)[] }>
  update(options: Record<string, unknown>): Promise<InvitationClaimDocument | { docs: InvitationClaimDocument[] }>
}

export type InvitationClaimResult =
  | { readonly kind: 'claimed'; readonly document: InvitationClaimDocument }
  | { readonly kind: 'missing' }
  | { readonly kind: 'expired' }
  | { readonly kind: 'used' }
  | { readonly kind: 'busy' }

function docsOf(result: InvitationClaimDocument | { docs: InvitationClaimDocument[] }): InvitationClaimDocument[] {
  const docs = (result as { docs?: unknown }).docs
  if (Array.isArray(docs)) return docs as InvitationClaimDocument[]
  return [result as InvitationClaimDocument]
}

function validDocument(document: InvitationClaimDocument | undefined, now: number): InvitationClaimResult | undefined {
  if (document === undefined) return { kind: 'missing' }
  if (document.status === 'accepted' || document.status === 'revoked' || document.status === 'expired')
    return { kind: 'used' }
  if (typeof document.expiresAt !== 'number' || document.expiresAt <= now) return { kind: 'expired' }
  return undefined
}

export function createInvitationClaimId(): string {
  return crypto.randomUUID()
}

export async function claimInvitationWithCas({
  store,
  tokenHash,
  claimId,
  req,
  initial,
  now = Date.now(),
}: Readonly<{
  store: InvitationClaimStore
  tokenHash: string
  claimId: string
  req: unknown
  initial?: InvitationClaimDocument
  now?: number
}>): Promise<InvitationClaimResult> {
  const document =
    initial ??
    (
      await store.find({
        collection: 'invitations',
        where: { tokenHash: { equals: tokenHash } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
        req,
      })
    ).docs[0]
  const invalid = validDocument(document, now)
  if (invalid !== undefined) return invalid
  if (document === undefined) return { kind: 'missing' }
  if (document.status === 'accepting')
    return document.claimId === claimId ? { kind: 'claimed', document } : { kind: 'busy' }
  if (document?.status !== 'pending') return { kind: 'missing' }

  const claimed = await store.update({
    collection: 'invitations',
    where: { and: [{ id: { equals: document.id } }, { status: { equals: 'pending' } }] },
    limit: 1,
    data: { status: 'accepting', claimId, claimedAt: now },
    overrideAccess: true,
    req,
  })
  const claimedDocument = docsOf(claimed)[0]
  if (claimedDocument !== undefined) return { kind: 'claimed', document: claimedDocument }
  const current = (
    await store.find({
      collection: 'invitations',
      where: { tokenHash: { equals: tokenHash } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })
  ).docs[0]
  return current?.status === 'accepting' && current.claimId === claimId
    ? { kind: 'claimed', document: current }
    : { kind: 'busy' }
}

export async function completeInvitationClaim({
  store,
  invitationId,
  claimId,
  req,
}: Readonly<{
  store: InvitationClaimStore
  invitationId: string | number
  claimId: string
  req: unknown
}>): Promise<boolean> {
  const result = await store.update({
    collection: 'invitations',
    where: {
      and: [{ id: { equals: invitationId } }, { status: { equals: 'accepting' } }, { claimId: { equals: claimId } }],
    },
    limit: 1,
    data: { status: 'accepted', acceptedAt: Date.now() },
    overrideAccess: true,
    req,
  })
  return docsOf(result).length > 0
}
