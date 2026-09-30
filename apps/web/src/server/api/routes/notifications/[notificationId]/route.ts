import config from '@payload-config'
import { getPayload } from 'payload'
import { authenticate, requestForUser } from '../../../../collaboration/auth'
import { payloadNotFoundOrDenied, unauthorized } from '../../../../collaboration/responses'

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
    // An id that is not the user's own notification, or not an id at all, answers 404 before the write.
    const owned = await payload.find({
      collection: 'notifications',
      where: { id: { equals: notificationId } },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user: context.user,
      req,
    })
    if (owned.docs.length === 0) return Response.json({ error: 'Not found' }, { status: 404 })
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
    console.error('[notification read]', error)
    return payloadNotFoundOrDenied(error) ?? Response.json({ error: 'Unable to update notification.' }, { status: 500 })
  }
}
