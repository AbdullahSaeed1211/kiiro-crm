import config from '@payload-config'
import { getPayload } from 'payload'
import { authenticate, requestForUser } from '../../../../../collaboration/auth'
import { canReadParent } from '../../../../../collaboration/parents'
import { payloadNotFoundOrDenied, unauthorized } from '../../../../../collaboration/responses'

interface Params {
  readonly params: Promise<{ messageId: string }>
}

/** Marks an inbound email read for the signed-in user after checking its record scope. */
export async function PATCH(request: Request, { params }: Params): Promise<Response> {
  const payload = await getPayload({ config })
  const context = await authenticate(payload, request)
  if (context === null) return unauthorized()
  const req = requestForUser(payload, context.user)
  const { messageId } = await params
  try {
    const message = (await payload.findByID({
      collection: 'emailMessages',
      id: messageId,
      depth: 0,
      overrideAccess: true,
      user: context.user,
      req,
    })) as unknown as Record<string, unknown>
    const recordType = typeof message.recordType === 'string' ? message.recordType : ''
    const recordId = typeof message.recordId === 'string' ? message.recordId : ''
    if (!(await canReadParent(payload, context, { recordType, recordId })))
      return Response.json({ error: 'Not found.' }, { status: 404 })
    const readBy = Array.isArray(message.readBy)
      ? message.readBy.filter((item): item is string => typeof item === 'string')
      : []
    const nextReadBy = [...new Set([...readBy, context.id])]
    const updated = await payload.update({
      collection: 'emailMessages',
      id: messageId,
      data: { readBy: nextReadBy },
      depth: 0,
      overrideAccess: true,
      user: context.user,
      req,
    })
    return Response.json({ message: updated })
  } catch (error) {
    return payloadNotFoundOrDenied(error) ?? Response.json({ error: 'Unable to mark email read.' }, { status: 500 })
  }
}
