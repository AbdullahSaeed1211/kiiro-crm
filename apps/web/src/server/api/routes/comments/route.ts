import config from '@payload-config'
import { getPayload } from 'payload'
import { createComment } from '../../../../../../../packages/adapters/payload/src/collaboration/comments'
import { authenticate, requestForUser } from '../../../collaboration/auth'
import { badRequest, payloadNotFoundOrDenied, unauthorized } from '../../../collaboration/responses'

interface CommentInput {
  readonly recordType: string
  readonly recordId: string
  readonly body: string
}

function parseCommentInput(input: unknown): CommentInput | Response {
  if (typeof input !== 'object' || input === null) return badRequest('recordType, recordId and body are required.')
  const candidate = input as { recordType?: unknown; recordId?: unknown; body?: unknown }
  if (
    typeof candidate.recordType !== 'string' ||
    typeof candidate.recordId !== 'string' ||
    candidate.recordType === '' ||
    candidate.recordId === '' ||
    typeof candidate.body !== 'string'
  )
    return badRequest('recordType, recordId and body are required.')
  return { recordType: candidate.recordType, recordId: candidate.recordId, body: candidate.body }
}

function commentError(error: unknown): Response {
  const mapped = payloadNotFoundOrDenied(error)
  if (mapped !== undefined) return mapped
  if (error instanceof Error && error.message.includes('not available'))
    return Response.json({ error: 'Not found' }, { status: 404 })
  return badRequest(error instanceof Error ? error.message : 'Unable to create comment.')
}

/** Creates a scoped comment and performs mention fan-out through the adapter boundary. */
export async function POST(request: Request): Promise<Response> {
  const payload = await getPayload({ config })
  const context = await authenticate(payload, request)
  if (context === null) return unauthorized()
  let input: unknown
  try {
    input = await request.json()
  } catch {
    return badRequest('A JSON body is required.')
  }
  const parsed = parseCommentInput(input)
  if (parsed instanceof Response) return parsed
  try {
    const result = await createComment(requestForUser(payload, context.user), parsed)
    return Response.json(result, { status: 201 })
  } catch (error) {
    return commentError(error)
  }
}
