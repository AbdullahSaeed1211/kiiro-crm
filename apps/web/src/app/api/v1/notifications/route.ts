import config from '@payload-config'
import { getPayload, type PayloadRequest } from 'payload'
import type { Where } from 'payload'
import { authenticate, type AuthContext } from '../../../../server/collaboration/auth'
import { unauthorized } from '../../../../server/collaboration/responses'

export const dynamic = 'force-dynamic'

function requestForUser(
  payload: Awaited<ReturnType<typeof getPayload>>,
  user: Record<string, unknown>,
): PayloadRequest {
  return { payload, user } as unknown as PayloadRequest
}

/** Lists the signed-in user's notifications, with read and newest-first filters applied in the database. */
export async function GET(request: Request): Promise<Response> {
  let payload: Awaited<ReturnType<typeof getPayload>>
  try {
    payload = await getPayload({ config })
  } catch {
    return Response.json({ notifications: [] })
  }
  let context: AuthContext | null
  try {
    context = await authenticate(payload, request)
  } catch {
    return unauthorized()
  }
  if (context === null) return unauthorized()
  const req = requestForUser(payload, context.user)
  const url = new URL(request.url)
  const unreadOnly = url.searchParams.get('unread') === '1'
  const where: Where = unreadOnly
    ? { and: [{ user: { equals: context.id } }, { readAt: { exists: false } }] }
    : { user: { equals: context.id } }
  const result = await payload.find({
    collection: 'notifications',
    where,
    sort: '-createdAt',
    limit: 50,
    depth: 0,
    // `authenticate` establishes the session and the user equality predicate
    // is the complete scope for this endpoint. Avoid re-running the
    // collection-level access evaluator for this direct API read.
    overrideAccess: true,
    user: context.user,
    req,
  })
  return Response.json({ notifications: result.docs })
}
