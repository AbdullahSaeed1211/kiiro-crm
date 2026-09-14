import config from '@payload-config'
import { getPayload } from 'payload'
import { authenticate } from '../../../../../server/collaboration/auth'
import { unauthorized } from '../../../../../server/collaboration/responses'

export const dynamic = 'force-dynamic'

/** Returns only the signed-in user's unread notification count. */
export async function GET(request: Request): Promise<Response> {
  const payload = await getPayload({ config })
  const context = await authenticate(payload, request)
  if (context === null) return unauthorized()
  const result = await payload.count({
    collection: 'notifications',
    where: { and: [{ user: { equals: context.id } }, { readAt: { exists: false } }] },
    overrideAccess: false,
    user: context.user,
  })
  return Response.json({ count: result.totalDocs })
}
