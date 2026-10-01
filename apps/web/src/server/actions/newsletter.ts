'use server'

import { getCloudflareContext } from '@opennextjs/cloudflare'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { actionError, actionFailure, actionOk, type ActionResult } from '../action-result'
import { requireRole } from '../auth/context'
import { getOutboundEmailEnabled, OUTBOUND_EMAIL_DISABLED_MESSAGE } from '../capabilities'
import { crmDeps } from '../container'
import { sendCampaign } from '../newsletter/campaign'
import { enqueueCampaign, sendNextRound } from '../newsletter/queue'
import { AUDIENCES_FIELD_KEY, inAudience, listSubscribers, NEWSLETTER_FIELD_KEY } from '../newsletter/subscribers'

const NEWSLETTER_PATH = '/settings/newsletter'

const sendSchema = z
  .object({
    subject: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(20_000),
    testOnly: z.boolean(),
    audience: z.string().trim().max(60).optional(),
  })
  .strict()

interface NewsletterField {
  readonly recordType: 'contact' | 'lead'
  readonly key: string
  readonly label: string
  readonly type: 'checkbox' | 'multiSelect'
}

const NEWSLETTER_FIELDS: readonly NewsletterField[] = [
  { recordType: 'contact', key: NEWSLETTER_FIELD_KEY, label: 'Newsletter subscriber', type: 'checkbox' },
  { recordType: 'lead', key: NEWSLETTER_FIELD_KEY, label: 'Newsletter opt-in', type: 'checkbox' },
  { recordType: 'contact', key: AUDIENCES_FIELD_KEY, label: 'Newsletter audiences', type: 'multiSelect' },
]

/** Adds the newsletter's custom fields: the opt-in on contacts and leads, and the audiences on contacts. */
export async function enableNewsletter(): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager')
  try {
    for (const { recordType, key, label, type } of NEWSLETTER_FIELDS) {
      const existing = await context.payload.find({
        collection: 'fieldDefinitions',
        where: { and: [{ recordType: { equals: recordType } }, { key: { equals: key } }] },
        limit: 1,
        depth: 0,
        overrideAccess: false,
        req: context.req,
      })
      if (existing.docs.length > 0) continue
      await context.payload.create({
        collection: 'fieldDefinitions',
        data: {
          recordType,
          key,
          label,
          type,
          required: false,
          options: [],
          visibility: 'all',
          sensitive: false,
          hidden: false,
          position: 100,
        },
        overrideAccess: false,
        req: context.req,
      })
    }
    revalidatePath(NEWSLETTER_PATH)
    return actionOk()
  } catch (error) {
    return actionFailure(error, 'enableNewsletter', 'Unable to turn on the newsletter.')
  }
}

const audiencesSchema = z.array(z.string().trim().min(1).max(60)).max(30)

/** Replaces the list of audience names offered on contacts; duplicates are dropped. */
export async function saveAudiences(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager')
  const parsed = audiencesSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION', 'Give each audience a short name.')
  try {
    const found = await context.payload.find({
      collection: 'fieldDefinitions',
      where: { and: [{ recordType: { equals: 'contact' } }, { key: { equals: AUDIENCES_FIELD_KEY } }] },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      req: context.req,
    })
    const field = found.docs.at(0)
    if (field === undefined) return actionError('NOT_FOUND', 'Turn on the newsletter first.')
    await context.payload.update({
      collection: 'fieldDefinitions',
      id: field.id,
      data: { options: [...new Set(parsed.data)] },
      overrideAccess: false,
      req: context.req,
    })
    revalidatePath(NEWSLETTER_PATH)
    return actionOk()
  } catch (error) {
    return actionFailure(error, 'saveAudiences', 'Unable to save the audiences.')
  }
}

async function siteOrigin(): Promise<string> {
  const list = await headers()
  const host = list.get('x-forwarded-host') ?? list.get('host') ?? ''
  return `${list.get('x-forwarded-proto') ?? 'https'}://${host}`
}

type SendOutcome = ActionResult<{ sent: number; failed: number; waiting: number }>
type Actor = Awaited<ReturnType<typeof requireRole>>
type Parsed = z.infer<typeof sendSchema>

async function sendTest(context: Actor, parsed: Parsed): Promise<SendOutcome> {
  const own = await context.payload.findByID({ collection: 'users', id: String(context.actor.id), depth: 0 })
  const result = await sendCampaign({
    payload: context.payload,
    origin: await siteOrigin(),
    recipients: [{ id: String(context.actor.id), email: own.email, name: own.name, audiences: [] }],
    message: { subject: parsed.subject, body: parsed.body },
  })
  return { ok: true, data: { ...result, waiting: 0 } }
}

async function queueAndSend(context: Actor, parsed: Parsed): Promise<SendOutcome> {
  const recipients = inAudience(await listSubscribers(await crmDeps()), parsed.audience)
  if (recipients.length === 0) return actionError('VALIDATION', 'Nobody is subscribed to receive this.')
  const { env } = await getCloudflareContext({ async: true })
  await enqueueCampaign({
    payload: context.payload,
    origin: await siteOrigin(),
    from: env.MAIL_FROM_ADDRESS,
    message: { subject: parsed.subject, body: parsed.body },
    recipientIds: recipients.map((recipient) => recipient.id),
  })
  const round = await sendNextRound(context.payload)
  revalidatePath(NEWSLETTER_PATH)
  return { ok: true, data: { sent: round.sent, failed: round.failed, waiting: round.left } }
}

/** Sends the message to the signed-in user only (a test), or queues it for every subscriber and sends the first round. */
export async function sendNewsletter(input: unknown): Promise<SendOutcome> {
  const context = await requireRole('owner', 'manager')
  const parsed = sendSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION', 'Add a subject and a message.')
  if (!(await getOutboundEmailEnabled())) return actionError('UNAVAILABLE', OUTBOUND_EMAIL_DISABLED_MESSAGE)
  try {
    return parsed.data.testOnly ? await sendTest(context, parsed.data) : await queueAndSend(context, parsed.data)
  } catch (error) {
    return actionFailure(error, 'sendNewsletter', 'Unable to send the newsletter.')
  }
}
