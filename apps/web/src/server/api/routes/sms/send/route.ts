import config from '@payload-config'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getPayload, type Payload } from 'payload'
import { z } from 'zod'
import { authenticate, requestForUser, type AuthContext } from '../../../../collaboration/auth'
import { canReadParent } from '../../../../collaboration/parents'
import { badRequest, forbidden, unauthorized } from '../../../../collaboration/responses'
import { internationalNumber, sendSms, smsConfig, type SmsConfig } from '../../../../sms/transport'
import { failure, success } from '../../../respond'

const MAX_BODY = 480
const NO_NUMBER = 'This record has no phone number with a country code, like +1 555 0100.'
const COLLECTIONS = { contact: 'contacts', lead: 'leads', organization: 'organizations' } as const

const sendSchema = z
  .object({
    recordType: z.enum(['contact', 'lead', 'organization']),
    recordId: z.string().trim().min(1),
    body: z
      .string('Write a message.')
      .trim()
      .min(1, 'Write a message.')
      .max(MAX_BODY, 'Keep the text under 480 characters.'),
  })
  .strict()

type SendInput = z.infer<typeof sendSchema>

/** The record's own phone number in international form; the caller never chooses who is texted. */
async function recipientOf(payload: Payload, context: AuthContext, input: SendInput): Promise<string | undefined> {
  const record = await payload.findByID({
    collection: COLLECTIONS[input.recordType],
    id: input.recordId,
    depth: 0,
    overrideAccess: false,
    user: context.user,
  })
  const phone: unknown = Reflect.get(record, 'phone')
  return typeof phone === 'string' ? internationalNumber(phone) : undefined
}

interface Delivery {
  readonly payload: Payload
  readonly context: AuthContext
  readonly input: SendInput
  readonly sms: SmsConfig
  readonly to: string
}

/** Marks the saved text sent or failed. The collection is system-write-only; the record check above is the boundary. */
function markText(
  delivery: Delivery,
  id: string,
  outcome: { status: 'sent'; messageId: string } | { status: 'failed'; error: string },
) {
  const { payload, context } = delivery
  return payload.update({
    collection: 'emailMessages',
    id,
    data: outcome,
    depth: 0,
    overrideAccess: true,
    user: context.user,
    req: requestForUser(payload, context.user),
  })
}

/** Saves the text as queued first, sends it, then marks the row sent or failed so a crash leaves a visible row. */
async function queueAndSend(delivery: Delivery): Promise<Response> {
  const { payload, input, sms, to, context } = delivery
  const queued = await payload.create({
    collection: 'emailMessages',
    data: {
      direction: 'outbound',
      recordType: input.recordType,
      recordId: input.recordId,
      messageId: `sms-queued-${crypto.randomUUID()}`,
      from: sms.from,
      to: [to],
      cc: [],
      subject: 'Text message',
      textBody: input.body,
      attachments: [],
      status: 'queued',
      occurredAt: Date.now(),
    },
    depth: 0,
    overrideAccess: true,
    user: context.user,
    req: requestForUser(payload, context.user),
  })
  try {
    const providerId = await sendSms(sms, { to, body: input.body })
    await markText(delivery, queued.id, { status: 'sent', messageId: `sms:${providerId}` })
    return success({ status: 'sent', id: queued.id }, 201)
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 2000) : 'Unable to send the text.'
    await markText(delivery, queued.id, { status: 'failed', error: reason }).catch(() => undefined)
    return failure('UNAVAILABLE', 'Unable to send the text.', { status: 502 })
  }
}

async function readInput(request: Request): Promise<SendInput | Response> {
  const body: unknown = await request.json().catch(() => undefined)
  const parsed = sendSchema.safeParse(body)
  return parsed.success ? parsed.data : badRequest(parsed.error.issues[0]?.message ?? 'The request is invalid.')
}

/** Tells a signed-in person whether this workspace has text messaging set up, so the Text button shows only then. */
export async function GET(request: Request): Promise<Response> {
  const payload = await getPayload({ config })
  if ((await authenticate(payload, request)) === null) return unauthorized()
  const { env } = await getCloudflareContext({ async: true })
  return success({ enabled: smsConfig(env) !== undefined })
}

/** Sends a text to the phone number on a record the caller can read, and records it on that record. */
export async function POST(request: Request): Promise<Response> {
  const payload = await getPayload({ config })
  const context = await authenticate(payload, request)
  if (context === null) return unauthorized()
  const { env } = await getCloudflareContext({ async: true })
  const sms = smsConfig(env)
  if (sms === undefined) return failure('UNAVAILABLE', 'Text messages are not set up for this workspace.')
  const input = await readInput(request)
  if (input instanceof Response) return input
  if (!(await canReadParent(payload, context, input))) return forbidden()
  const to = await recipientOf(payload, context, input)
  if (to === undefined) return badRequest(NO_NUMBER)
  return queueAndSend({ payload, context, input, sms, to })
}
