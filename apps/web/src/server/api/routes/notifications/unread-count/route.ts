import config from '@payload-config'
import { getPayload } from 'payload'
import { authenticate, type AuthContext, requestForUser } from '../../../../collaboration/auth'
import { unauthorized } from '../../../../collaboration/responses'
import { success } from '../../../respond'

/** Returns only the signed-in user's unread notification count. */
export async function GET(request: Request): Promise<Response> {
  let payload: Awaited<ReturnType<typeof getPayload>>
  try {
    payload = await getPayload({ config })
  } catch {
    return success({ count: 0 })
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
    return success({ count: result.totalDocs })
  } catch {
    // Notification badges are enhancement-only. A transient local adapter
    // or access-policy failure must never turn every app route into a 500.
    return success({ count: 0 })
  }
}
