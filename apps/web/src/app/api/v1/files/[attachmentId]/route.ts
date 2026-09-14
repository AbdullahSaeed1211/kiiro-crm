import config from '@payload-config'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getPayload } from 'payload'
import { authenticate } from '../../../../../server/collaboration/auth'
import { canReadParent } from '../../../../../server/collaboration/parents'
import { forbidden, unauthorized } from '../../../../../server/collaboration/responses'

export const dynamic = 'force-dynamic'

interface Params {
  readonly params: Promise<{ attachmentId: string }>
}

function downloadHeaders(doc: Record<string, unknown>, contentType: string | undefined): Headers {
  const name = typeof doc.fileName === 'string' ? doc.fileName : 'download'
  const headers = new Headers({
    'Content-Disposition': `attachment; filename="${name.replaceAll('"', '')}"`,
    'Cache-Control': 'private, no-store',
  })
  if (contentType !== undefined) headers.set('Content-Type', contentType)
  return headers
}

interface AttachmentInfo {
  readonly doc: Record<string, unknown>
  readonly recordType: string
  readonly recordId: string
  readonly fileKey: string
}

async function readAttachment(
  payload: Awaited<ReturnType<typeof getPayload>>,
  id: string,
  user: Record<string, unknown>,
): Promise<AttachmentInfo | null> {
  const attachment = await payload.findByID({ collection: 'attachments', id, depth: 0, overrideAccess: false, user })
  const doc = attachment as unknown as Record<string, unknown>
  const recordType = typeof doc.recordType === 'string' ? doc.recordType : ''
  const recordId = typeof doc.recordId === 'string' ? doc.recordId : ''
  const fileKey = typeof doc.fileKey === 'string' ? doc.fileKey : ''
  return recordType !== '' && recordId !== '' && fileKey !== '' ? { doc, recordType, recordId, fileKey } : null
}

/** Streams a private R2 object only after both attachment and parent authorization. */
export async function GET(request: Request, { params }: Params): Promise<Response> {
  const contextPayload = await getPayload({ config })
  const context = await authenticate(contextPayload, request)
  if (context === null) return unauthorized()
  const { attachmentId } = await params
  const attachment = await readAttachment(contextPayload, attachmentId, context.user)
  if (attachment === null || !(await canReadParent(contextPayload, context, attachment))) return forbidden()
  const { env } = await getCloudflareContext({ async: true })
  const object = await env.R2.get(attachment.fileKey)
  if (object === null) return new Response('Not found', { status: 404 })
  return new Response(object.body, { headers: downloadHeaders(attachment.doc, object.httpMetadata?.contentType) })
}
