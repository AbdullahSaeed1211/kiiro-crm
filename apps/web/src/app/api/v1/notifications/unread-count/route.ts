import config from '@payload-config'
import { getPayload, type PayloadRequest } from 'payload'
import { authenticate } from '../../../../../server/collaboration/auth'
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
  const payload = await getPayload({ config })
  const context = await authenticate(payload, request)
  if (context === null) return unauthorized()
  const req = requestForUser(payload, context.user)
  const result = await payload.count({
    collection: 'notifications',
    where: { and: [{ user: { equals: context.id } }, { readAt: { exists: false } }] },
    overrideAccess: false,
    user: context.user,
    req,
  })
  return Response.json({ count: result.totalDocs })
}
