import config from '@payload-config'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getPayload, type PayloadRequest } from 'payload'
import {
  attachmentKey,
  MAX_ATTACHMENT_BYTES,
  validateAttachment,
} from '../../../../../../../packages/adapters/payload/src/collaboration/files'
import { authenticate } from '../../../../server/collaboration/auth'
import { canReadParent } from '../../../../server/collaboration/parents'
import {
  badRequest,
  forbidden,
  payloadNotFoundOrDenied,
  unauthorized,
} from '../../../../server/collaboration/responses'

export const dynamic = 'force-dynamic'

interface UploadInput {
  readonly recordType: string
  readonly recordId: string
  readonly file: File
}

function parseUpload(form: FormData): UploadInput | Response {
  const recordType = form.get('recordType')
  const recordId = form.get('recordId')
  const file = form.get('file')
  if (typeof recordType !== 'string' || typeof recordId !== 'string' || !(file instanceof File))
    return badRequest('recordType, recordId and file are required.')
  return { recordType, recordId, file }
}

interface AttachmentInput {
  readonly payload: Awaited<ReturnType<typeof getPayload>>
  readonly req: PayloadRequest
  readonly input: UploadInput
  readonly key: string
  readonly user: Record<string, unknown>
  readonly userId: string
}

function createAttachment({ payload, req, input, key, user, userId }: AttachmentInput) {
  const create = payload.create as unknown as (args: Record<string, unknown>) => Promise<unknown>
  return create({
    collection: 'attachments',
    data: {
      recordType: input.recordType,
      recordId: input.recordId,
      fileKey: key,
      fileName: input.file.name,
      mime: input.file.type,
      sizeBytes: input.file.size,
      uploadedBy: userId,
    },
    draft: false,
    depth: 0,
    overrideAccess: false,
    user,
    req,
  })
}

interface StoreInput extends AttachmentInput {
  readonly env: CloudflareEnv
}

async function storeUpload({ env, payload, req, input, key, user, userId }: StoreInput): Promise<Response> {
  await env.R2.put(key, await input.file.arrayBuffer(), { httpMetadata: { contentType: input.file.type } })
  try {
    const attachment = await createAttachment({ payload, req, input, key, user, userId })
    return Response.json({ attachment }, { status: 201 })
  } catch (error) {
    await env.R2.delete(key)
    console.error('attachment metadata write failed', error)
    const expected = payloadNotFoundOrDenied(error)
    if (expected !== undefined) return expected
    return Response.json({ error: 'Unable to save the attachment.' }, { status: 500 })
  }
}

/** Uploads a private record attachment to R2 after the parent record scope check. */
export async function POST(request: Request): Promise<Response> {
  const contentLength = Number(request.headers.get('content-length') ?? '')
  if (Number.isFinite(contentLength) && contentLength > MAX_ATTACHMENT_BYTES + 1024 * 1024)
    return new Response('Payload too large', { status: 413 })
  const payload = await getPayload({ config })
  const context = await authenticate(payload, request)
  if (context === null) return unauthorized()
  const parsed = parseUpload(await request.formData())
  if (parsed instanceof Response) return parsed
  const uploadError = validateAttachment(parsed.file)
  if (uploadError !== undefined) return badRequest(uploadError)
  if (!(await canReadParent(payload, context, { recordType: parsed.recordType, recordId: parsed.recordId })))
    return forbidden()
  const { env } = await getCloudflareContext({ async: true })
  const payloadRequest = { payload, user: context.user } as unknown as PayloadRequest
  const id = crypto.randomUUID()
  const key = attachmentKey({
    recordType: parsed.recordType,
    recordId: parsed.recordId,
    attachmentId: id,
    fileName: parsed.file.name,
  })
  return storeUpload({ env, payload, req: payloadRequest, input: parsed, key, user: context.user, userId: context.id })
}
