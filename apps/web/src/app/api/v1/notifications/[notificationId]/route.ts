import config from '@payload-config'
import { getPayload, type PayloadRequest } from 'payload'
import { authenticate } from '../../../../../server/collaboration/auth'
import { payloadNotFoundOrDenied, unauthorized } from '../../../../../server/collaboration/responses'

export const dynamic = 'force-dynamic'

function requestForUser(
  payload: Awaited<ReturnType<typeof getPayload>>,
  user: Record<string, unknown>,
): PayloadRequest {
  return { payload, user } as unknown as PayloadRequest
}

interface Params {
  readonly params: Promise<{ notificationId: string }>
}

/** Marks one owned notification read; Payload access prevents cross-user updates. */
export async function PATCH(request: Request, { params }: Params): Promise<Response> {
  const payload = await getPayload({ config })
  const context = await authenticate(payload, request)
  if (context === null) return unauthorized()
  const req = requestForUser(payload, context.user)
  const { notificationId } = await params
  try {
    const notification = await payload.update({
      collection: 'notifications',
      id: notificationId,
      data: { readAt: Date.now() },
      depth: 0,
      overrideAccess: false,
      user: context.user,
      req,
    })
    return Response.json({ notification })
  } catch (error) {
    return payloadNotFoundOrDenied(error) ?? Response.json({ error: 'Unable to update notification.' }, { status: 500 })
  }
}
