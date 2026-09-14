import config from '@payload-config'
import { getPayload } from 'payload'
import type { Where } from 'payload'
import { authenticate } from '../../../../server/collaboration/auth'
import { unauthorized } from '../../../../server/collaboration/responses'

export const dynamic = 'force-dynamic'

/** Lists the signed-in user's notifications, with read and newest-first filters applied in the database. */
export async function GET(request: Request): Promise<Response> {
  const payload = await getPayload({ config })
  const context = await authenticate(payload, request)
  if (context === null) return unauthorized()
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
    overrideAccess: false,
    user: context.user,
  })
  return Response.json({ notifications: result.docs })
}
