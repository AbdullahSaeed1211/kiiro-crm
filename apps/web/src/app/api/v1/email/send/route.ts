import config from '@payload-config'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { isOutboundEmailEnabled, OUTBOUND_EMAIL_DISABLED_MESSAGE } from '../../../../../server/capabilities'
import { getPayload, type Payload, type PayloadRequest } from 'payload'
import { authenticate } from '../../../../../server/collaboration/auth'
import { canReadParent } from '../../../../../server/collaboration/parents'
import {
  badRequest,
  forbidden,
  payloadNotFoundOrDenied,
  unauthorized,
} from '../../../../../server/collaboration/responses'

export const dynamic = 'force-dynamic'

const MAX_RECIPIENTS = 50
const MAX_SUBJECT = 998
const MAX_BODY = 200_000
const MAX_TOTAL_ATTACHMENT_BYTES = 5 * 1024 * 1024 - 128 * 1024
type RecordType = 'organization' | 'project' | 'task' | 'contact' | 'lead' | 'deal'

function isEmail(value: string): boolean {
  const at = value.indexOf('@')
  return at > 0 && at === value.lastIndexOf('@') && value.lastIndexOf('.') > at + 1 && at < value.length - 1
}

interface SendInput {
  readonly recordType: RecordType
  readonly recordId: string
  readonly to: readonly string[]
  readonly subject: string
  readonly textBody: string
  readonly attachmentIds: readonly string[]
  readonly inReplyTo?: string
}

// eslint-disable-next-line complexity, max-statements, sonarjs/cognitive-complexity -- request parsing is the single validation boundary.
function parseInput(value: unknown): SendInput | Response {
  if (typeof value !== 'object' || value === null) return badRequest('A JSON body is required.')
  const input = value as Record<string, unknown>
  const recordTypeValue = typeof input.recordType === 'string' ? input.recordType.trim() : ''
  const recordType = ['organization', 'project', 'task', 'contact', 'lead', 'deal'].includes(recordTypeValue)
    ? (recordTypeValue as RecordType)
    : null
  const recordId = typeof input.recordId === 'string' ? input.recordId.trim() : ''
  const subject = typeof input.subject === 'string' ? input.subject.trim() : ''
  const textBody = typeof input.textBody === 'string' ? input.textBody.trim() : ''
  const to = Array.isArray(input.to) ? input.to.filter((item): item is string => typeof item === 'string') : []
  const attachmentIds = Array.isArray(input.attachmentIds)
    ? input.attachmentIds.filter((item): item is string => typeof item === 'string')
    : []
  const inReplyTo =
    typeof input.inReplyTo === 'string' && input.inReplyTo.trim() !== '' ? input.inReplyTo.trim() : undefined
  if (recordType === null || recordId === '' || to.length === 0 || to.length > MAX_RECIPIENTS)
    return badRequest(`recordType, recordId and 1-${String(MAX_RECIPIENTS)} recipients are required.`)
  if (to.some((address) => !isEmail(address.trim()))) return badRequest('Enter valid recipient email addresses.')
  if (subject === '' || subject.length > MAX_SUBJECT) return badRequest('Subject is required and must be shorter.')
  if (textBody === '' || textBody.length > MAX_BODY) return badRequest('Message is required and must be shorter.')
  if (attachmentIds.some((id) => id.trim() === '')) return badRequest('Attachment ids must not be empty.')
  return {
    recordType,
    recordId,
    to: [...new Set(to.map((address) => address.trim().toLowerCase()))],
    subject,
    textBody,
    attachmentIds: [...new Set(attachmentIds)],
    ...(inReplyTo === undefined ? {} : { inReplyTo }),
  }
}

interface AuthorizedAttachment {
  readonly id: string
  readonly fileKey: string
  readonly fileName: string
  readonly mime: string
  readonly sizeBytes: number
}

async function loadAttachments(
  payload: Payload,
  input: SendInput,
  user: Record<string, unknown>,
): Promise<readonly AuthorizedAttachment[] | null> {
  if (input.attachmentIds.length === 0) return []
  const result = await payload.find({
    collection: 'attachments',
    where: {
      and: [
        { id: { in: [...input.attachmentIds] } },
        { recordType: { equals: input.recordType } },
        { recordId: { equals: input.recordId } },
      ],
    },
    limit: input.attachmentIds.length,
    pagination: false,
    depth: 0,
    overrideAccess: false,
    user,
  })
  if (result.docs.length !== input.attachmentIds.length) return null
  // eslint-disable-next-line complexity -- malformed attachment records are rejected at one normalization boundary.
  const attachments = result.docs.flatMap((doc) => {
    const value = doc as unknown as Record<string, unknown>
    const id = typeof value.id === 'string' ? value.id : null
    const fileKey = typeof value.fileKey === 'string' ? value.fileKey : null
    const fileName = typeof value.fileName === 'string' ? value.fileName : null
    const mime = typeof value.mime === 'string' ? value.mime : null
    const sizeBytes = typeof value.sizeBytes === 'number' ? value.sizeBytes : null
    return id === null || fileKey === null || fileName === null || mime === null || sizeBytes === null
      ? []
      : [{ id, fileKey, fileName, mime, sizeBytes }]
  })
  return attachments.length === input.attachmentIds.length ? attachments : null
}

function base64(bytes: ArrayBuffer): string {
  const data = new Uint8Array(bytes)
  let binary = ''
  for (let index = 0; index < data.length; index += 0x8000)
    binary += String.fromCharCode(...data.subarray(index, Math.min(index + 0x8000, data.length)))
  return btoa(binary)
}

function requestForUser(payload: Payload, user: Record<string, unknown>): PayloadRequest {
  return { payload, user } as unknown as PayloadRequest
}

/** Sends an authenticated, record-scoped message and persists queued/sent/failed state for retry visibility. */
// eslint-disable-next-line complexity, max-lines-per-function, max-statements, sonarjs/cognitive-complexity -- queue/send/update must remain atomic at this HTTP boundary.
export async function POST(request: Request): Promise<Response> {
  const payload = await getPayload({ config })
  const context = await authenticate(payload, request)
  if (context === null) return unauthorized()
  const { env } = await getCloudflareContext({ async: true })
  if (!isOutboundEmailEnabled(env.MAIL_TRANSPORT))
    return Response.json({ error: OUTBOUND_EMAIL_DISABLED_MESSAGE, code: 'EMAIL_DISABLED' }, { status: 503 })
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequest('A JSON body is required.')
  }
  const parsed = parseInput(body)
  if (parsed instanceof Response) return parsed
  if (!(await canReadParent(payload, context, parsed))) return forbidden()
  const attachments = await loadAttachments(payload, parsed, context.user)
  if (attachments === null) return forbidden()
  if (attachments.reduce((total, attachment) => total + attachment.sizeBytes, 0) > MAX_TOTAL_ATTACHMENT_BYTES)
    return badRequest('Attachments exceed the 5 MiB message limit.')
  const mailAttachments = []
  for (const attachment of attachments) {
    const object = await env.R2.get(attachment.fileKey)
    if (object === null) return Response.json({ error: 'Attachment is no longer available.' }, { status: 409 })
    mailAttachments.push({
      filename: attachment.fileName,
      contentType: attachment.mime,
      content: base64(await object.arrayBuffer()),
    })
  }

  const requestPayload = requestForUser(payload, context.user)
  const provisionalId = `queued-${crypto.randomUUID()}`
  let queued: { id: string }
  try {
    const created = await payload.create({
      collection: 'emailMessages',
      data: {
        direction: 'outbound',
        recordType: parsed.recordType,
        recordId: parsed.recordId,
        messageId: provisionalId,
        ...(parsed.inReplyTo === undefined ? {} : { inReplyTo: parsed.inReplyTo }),
        from: context.user.email,
        to: [...parsed.to],
        cc: [],
        subject: parsed.subject,
        textBody: parsed.textBody,
        attachments: [...parsed.attachmentIds],
        status: 'queued',
        occurredAt: Date.now(),
      },
      depth: 0,
      // The collection is system-write-only; the parent and attachment checks above are the user-facing boundary.
      overrideAccess: true,
      user: context.user,
      req: requestPayload,
    })
    queued = { id: created.id }
  } catch (error) {
    const expected = payloadNotFoundOrDenied(error)
    return expected ?? Response.json({ error: 'Unable to queue the message.' }, { status: 500 })
  }

  try {
    const result = await payload.sendEmail({
      to: [...parsed.to],
      subject: parsed.subject,
      text: parsed.textBody,
      html: `<p>${parsed.textBody.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\n', '<br />')}</p>`,
      ...(mailAttachments.length === 0 ? {} : { attachments: mailAttachments }),
    })
    const providerId =
      typeof result === 'object' && result !== null && 'messageId' in result ? result.messageId : undefined
    await payload.update({
      collection: 'emailMessages',
      id: queued.id,
      data: { messageId: typeof providerId === 'string' ? providerId : provisionalId, status: 'sent' },
      depth: 0,
      overrideAccess: true,
      user: context.user,
      req: requestPayload,
    })
    return Response.json({ status: 'sent', id: queued.id }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 2000) : 'Unable to send the message.'
    await payload
      .update({
        collection: 'emailMessages',
        id: queued.id,
        data: { status: 'failed', error: message },
        depth: 0,
        overrideAccess: true,
        user: context.user,
        req: requestPayload,
      })
      .catch(() => undefined)
    return Response.json({ error: 'Unable to send the message.', status: 'failed', id: queued.id }, { status: 502 })
  }
}
