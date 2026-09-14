import config from '@payload-config'
import { getPayload } from 'payload'
import { searchWorkspace } from '../../../../server/collaboration/service'
import { authenticate } from '../../../../server/collaboration/auth'
import { badRequest, unauthorized } from '../../../../server/collaboration/responses'

export const dynamic = 'force-dynamic'

/** Searches registered record types through their normal Payload scope access. */
export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams.get('q') ?? ''
  if (query.trim().length < 2 || query.trim().length > 80)
    return badRequest('q must contain between 2 and 80 characters.')
  const payload = await getPayload({ config })
  const context = await authenticate(payload, request)
  if (context === null) return unauthorized()
  const results = await searchWorkspace(payload, context, query)
  return Response.json({ results })
}
