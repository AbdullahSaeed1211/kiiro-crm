import config from '@payload-config'
import { getPayload } from 'payload'
import { authenticate } from '../../../../../server/collaboration/auth'
import { payloadNotFoundOrDenied, unauthorized } from '../../../../../server/collaboration/responses'

export const dynamic = 'force-dynamic'

interface Params {
  readonly params: Promise<{ notificationId: string }>
}

/** Marks one owned notification read; Payload access prevents cross-user updates. */
export async function PATCH(request: Request, { params }: Params): Promise<Response> {
  const payload = await getPayload({ config })
  const context = await authenticate(payload, request)
  if (context === null) return unauthorized()
  const { notificationId } = await params
  try {
    const notification = await payload.update({
      collection: 'notifications',
      id: notificationId,
      data: { readAt: Date.now() },
      depth: 0,
      overrideAccess: false,
      user: context.user,
    })
    return Response.json({ notification })
  } catch (error) {
    return payloadNotFoundOrDenied(error) ?? Response.json({ error: 'Unable to update notification.' }, { status: 500 })
  }
}
