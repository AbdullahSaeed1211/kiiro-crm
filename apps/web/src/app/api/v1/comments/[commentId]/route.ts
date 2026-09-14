import config from '@payload-config'
import { getPayload, type PayloadRequest } from 'payload'
import { softDeleteComment } from '../../../../../../../../packages/adapters/payload/src/collaboration/comments'
import { authenticate } from '../../../../../server/collaboration/auth'
import { badRequest, payloadNotFoundOrDenied, unauthorized } from '../../../../../server/collaboration/responses'

export const dynamic = 'force-dynamic'

interface Params {
  readonly params: Promise<{ commentId: string }>
}

function requestForUser(
  payload: Awaited<ReturnType<typeof getPayload>>,
  user: Record<string, unknown>,
): PayloadRequest {
  return { payload, user } as unknown as PayloadRequest
}

function deleteError(error: unknown): Response {
  const mapped = payloadNotFoundOrDenied(error)
  if (mapped !== undefined) return mapped
  if (error instanceof Error && error.message.includes('not available'))
    return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ error: 'Unable to delete comment.' }, { status: 500 })
}

/** Soft-deletes a comment for its author or a manager/owner without revealing cross-scope records. */
export async function DELETE(_request: Request, { params }: Params): Promise<Response> {
  const payload = await getPayload({ config })
  const context = await authenticate(payload, _request)
  if (context === null) return unauthorized()
  const { commentId } = await params
  if (commentId === '') return badRequest('commentId is required.')
  try {
    await softDeleteComment(requestForUser(payload, context.user), commentId)
    return new Response(null, { status: 204 })
  } catch (error) {
    return deleteError(error)
  }
}
