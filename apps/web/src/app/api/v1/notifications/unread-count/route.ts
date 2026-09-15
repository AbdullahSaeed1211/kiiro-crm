import config from '@payload-config'
import { getPayload, type PayloadRequest } from 'payload'
import { authenticate, type AuthContext } from '../../../../../server/collaboration/auth'
import { unauthorized } from '../../../../../server/collaboration/responses'

export const dynamic = 'force-dynamic'

function requestForUser(
  payload: Awaited<ReturnType<typeof getPayload>>,
  user: Record<string, unknown>,
): PayloadRequest {
  return { payload, user } as unknown as PayloadRequest
}

/** Returns only the signed-in user's unread notification count. */
export async function GET(request: Request): Promise<Response> {
  let payload: Awaited<ReturnType<typeof getPayload>>
  try {
    payload = await getPayload({ config })
  } catch {
    return Response.json({ count: 0 })
  }
  let context: AuthContext | null
  try {
    context = await authenticate(payload, request)
  } catch {
    return unauthorized()
  }
  if (context === null) return unauthorized()
  const req = requestForUser(payload, context.user)
  try {
    const result = await payload.count({
      collection: 'notifications',
      where: { and: [{ user: { equals: context.id } }, { readAt: { exists: false } }] },
      // `authenticate` establishes the session and the user equality
      // predicate is the complete scope for this endpoint.
      overrideAccess: true,
      user: context.user,
      req,
    })
    return Response.json({ count: result.totalDocs })
  } catch {
    // Notification badges are enhancement-only. A transient local adapter
    // or access-policy failure must never turn every app route into a 500.
    return Response.json({ count: 0 })
  }
}
