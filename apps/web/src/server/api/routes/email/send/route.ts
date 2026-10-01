import config from '@payload-config'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getPayload, type Payload } from 'payload'
import { z } from 'zod'
import { isOutboundEmailEnabled, OUTBOUND_EMAIL_DISABLED_MESSAGE } from '../../../../capabilities'
import { authenticate, requestForUser, type AuthContext } from '../../../../collaboration/auth'
import { canReadParent } from '../../../../collaboration/parents'
import { badRequest, forbidden, payloadNotFoundOrDenied, unauthorized } from '../../../../collaboration/responses'
import { failure, success } from '../../../respond'

const MAX_RECIPIENTS = 50
const MAX_SUBJECT = 998
const MAX_BODY = 200_000
const MAX_TOTAL_ATTACHMENT_BYTES = 5 * 1024 * 1024 - 128 * 1024
const RECIPIENT_MESSAGE = `recordType, recordId and 1-${String(MAX_RECIPIENTS)} recipients are required.`

function isEmail(value: string): boolean {
  const at = value.indexOf('@')
  return at > 0 && at === value.lastIndexOf('@') && value.lastIndexOf('.') > at + 1 && at < value.length - 1
}

const sendSchema = z.object({
  recordType: z.enum(['organization', 'project', 'task', 'contact', 'lead', 'deal'], RECIPIENT_MESSAGE),
  recordId: z.string(RECIPIENT_MESSAGE).trim().min(1, RECIPIENT_MESSAGE),
  to: z
    .array(z.string().trim().toLowerCase().refine(isEmail, 'Enter valid recipient email addresses.'))
    .min(1, RECIPIENT_MESSAGE)
    .max(MAX_RECIPIENTS, RECIPIENT_MESSAGE)
    .transform((addresses) => [...new Set(addresses)]),
  subject: z
    .string('Subject is required and must be shorter.')
    .trim()
    .min(1, 'Subject is required and must be shorter.')
    .max(MAX_SUBJECT, 'Subject is required and must be shorter.'),
  textBody: z
    .string('Message is required and must be shorter.')
    .trim()
    .min(1, 'Message is required and must be shorter.')
    .max(MAX_BODY, 'Message is required and must be shorter.'),
  attachmentIds: z
    .array(z.string().trim().min(1, 'Attachment ids must not be empty.'))
    .default([])
    .transform((ids) => [...new Set(ids)]),
  inReplyTo: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
})

type SendInput = z.infer<typeof sendSchema>

const attachmentSchema = z.object({
  id: z.string(),
  fileKey: z.string(),
  fileName: z.string(),
  mime: z.string(),
  sizeBytes: z.number(),
})

type AuthorizedAttachment = z.infer<typeof attachmentSchema>

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
  const attachments = result.docs.flatMap((doc) => {
    const parsed = attachmentSchema.safeParse(doc)
    return parsed.success ? [parsed.data] : []
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

type Env = Awaited<ReturnType<typeof getCloudflareContext>>['env']

/** Reads each attachment from storage into a mail attachment, or a 409 when one is gone. */
async function readAttachmentContent(env: Env, attachments: readonly AuthorizedAttachment[]) {
  const content = []
  for (const attachment of attachments) {
    const object = await env.R2.get(attachment.fileKey)
    if (object === null) return failure('CONFLICT', 'Attachment is no longer available.')
    content.push({
      filename: attachment.fileName,
      contentType: attachment.mime,
      content: base64(await object.arrayBuffer()),
    })
  }
  return content
}

const escapeHtml = (text: string): string =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\n', '<br />')

interface Delivery {
  readonly payload: Payload
  readonly context: AuthContext
  readonly input: SendInput
  readonly attachments: readonly { filename: string; contentType: string; content: string }[]
}

/** Records the message as queued before sending, so a crash mid-send leaves a visible row. */
async function queueMessage({ payload, context, input }: Delivery, provisionalId: string): Promise<string> {
  const created = await payload.create({
    collection: 'emailMessages',
    data: {
      direction: 'outbound',
      recordType: input.recordType,
      recordId: input.recordId,
      messageId: provisionalId,
      ...(input.inReplyTo === undefined ? {} : { inReplyTo: input.inReplyTo }),
      from: context.user.email,
      to: [...input.to],
      cc: [],
      subject: input.subject,
      textBody: input.textBody,
      attachments: [...input.attachmentIds],
      status: 'queued',
      occurredAt: Date.now(),
    },
    depth: 0,
    // The collection is system-write-only; the parent and attachment checks are the user-facing boundary.
    overrideAccess: true,
    user: context.user,
    req: requestForUser(payload, context.user),
  })
  return created.id
}

function markMessage(delivery: Delivery, id: string, data: Record<string, unknown>) {
  const { payload, context } = delivery
  return payload.update({
    collection: 'emailMessages',
    id,
    data,
    depth: 0,
    overrideAccess: true,
    user: context.user,
    req: requestForUser(payload, context.user),
  })
}

/** Sends the queued message and records the outcome; the response says which. */
async function deliver(delivery: Delivery, id: string, provisionalId: string): Promise<Response> {
  const { payload, input, attachments } = delivery
  try {
    const result = await payload.sendEmail({
      to: [...input.to],
      subject: input.subject,
      text: input.textBody,
      html: `<p>${escapeHtml(input.textBody)}</p>`,
      ...(attachments.length === 0 ? {} : { attachments }),
    })
    const providerId =
      typeof result === 'object' && result !== null && 'messageId' in result ? result.messageId : undefined
    await markMessage(delivery, id, {
      messageId: typeof providerId === 'string' ? providerId : provisionalId,
      status: 'sent',
    })
    return success({ status: 'sent', id }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 2000) : 'Unable to send the message.'
    await markMessage(delivery, id, { status: 'failed', error: message }).catch(() => undefined)
    return failure('UNAVAILABLE', 'Unable to send the message.', { status: 502 })
  }
}

/** Queues the message, then sends it; a queueing failure answers with the mapped error. */
async function queueAndDeliver(delivery: Delivery): Promise<Response> {
  const provisionalId = `queued-${crypto.randomUUID()}`
  let queuedId: string
  try {
    queuedId = await queueMessage(delivery, provisionalId)
  } catch (error) {
    return payloadNotFoundOrDenied(error) ?? failure('INTERNAL', 'Unable to queue the message.')
  }
  return deliver(delivery, queuedId, provisionalId)
}

/** Validates the JSON body, or answers 400. */
async function readInput(request: Request): Promise<SendInput | Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequest('A JSON body is required.')
  }
  const parsed = sendSchema.safeParse(body)
  return parsed.success ? parsed.data : badRequest(parsed.error.issues[0]?.message ?? 'The request is invalid.')
}

/** Checks the caller may read the record and every attachment, and that the attachments fit in one message. */
async function authorizeAttachments(
  payload: Payload,
  context: AuthContext,
  input: SendInput,
): Promise<readonly AuthorizedAttachment[] | Response> {
  if (!(await canReadParent(payload, context, input))) return forbidden()
  const attachments = await loadAttachments(payload, input, context.user)
  if (attachments === null) return forbidden()
  const total = attachments.reduce((sum, attachment) => sum + attachment.sizeBytes, 0)
  return total > MAX_TOTAL_ATTACHMENT_BYTES ? badRequest('Attachments exceed the 5 MiB message limit.') : attachments
}

/** Sends an authenticated, record-scoped message and persists queued/sent/failed state for retry visibility. */
export async function POST(request: Request): Promise<Response> {
  const payload = await getPayload({ config })
  const context = await authenticate(payload, request)
  if (context === null) return unauthorized()
  const { env } = await getCloudflareContext({ async: true })
  if (!isOutboundEmailEnabled(env.MAIL_TRANSPORT)) return failure('UNAVAILABLE', OUTBOUND_EMAIL_DISABLED_MESSAGE)
  const input = await readInput(request)
  if (input instanceof Response) return input
  const authorized = await authorizeAttachments(payload, context, input)
  if (authorized instanceof Response) return authorized
  const attachments = await readAttachmentContent(env, authorized)
  if (attachments instanceof Response) return attachments
  return queueAndDeliver({ payload, context, input, attachments })
}
