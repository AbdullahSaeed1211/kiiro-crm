import type { Id } from '@ops/kernel'
import type { Payload } from 'payload'
import { PEOPLE_COLLECTIONS } from '../../collections/people/'
import { fieldOf, idOf, numberOf } from '../documents'
import type { JobCursor } from './cursor'
import { isAfterCursor, withCursor } from './cursor'

export async function listExpiredInvitations(
  payload: Payload,
  input: { readonly at: number; readonly limit: number; readonly cursor?: JobCursor | undefined },
): Promise<readonly { readonly id: Id; readonly expiresAt: number; readonly updatedAt?: number }[]> {
  if (input.limit <= 0) return []
  const page = await payload.find({
    collection: PEOPLE_COLLECTIONS.invitations,
    where: withCursor(
      [{ status: { equals: 'pending' } }, { expiresAt: { less_than_equal: input.at } }],
      input.cursor,
      'expiresAt',
    ),
    sort: 'expiresAt',
    limit: input.limit,
    depth: 0,
    overrideAccess: true,
  })
  return page.docs.flatMap((doc) => {
    const id = idOf(fieldOf(doc, 'id'))
    const expiresAt = numberOf(doc, 'expiresAt')
    return id === undefined || expiresAt === null || !isAfterCursor(expiresAt, String(id), input.cursor)
      ? []
      : [{ id, expiresAt }]
  })
}

export async function expireInvitation(payload: Payload, id: Id): Promise<void> {
  await payload.update({
    collection: PEOPLE_COLLECTIONS.invitations,
    id,
    data: { status: 'expired' },
    overrideAccess: true,
  })
}
