'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { actionError, actionFailure, actionOk, type ActionResult } from '../action-result'
import { requireRole } from '../auth/context'
import { getOutboundEmailEnabled, OUTBOUND_EMAIL_DISABLED_MESSAGE } from '../capabilities'
import { crmDeps } from '../container'
import { sendCampaign, MAX_RECIPIENTS_PER_SEND } from '../newsletter/campaign'
import { listSubscribers, NEWSLETTER_FIELD_KEY } from '../newsletter/subscribers'

const NEWSLETTER_PATH = '/settings/newsletter'

const sendSchema = z
  .object({
    subject: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(20_000),
    testOnly: z.boolean(),
  })
  .strict()

/** Adds the opt-in checkbox to contacts, which is what makes a contact a subscriber. */
export async function enableNewsletter(): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager')
  try {
    const existing = await context.payload.find({
      collection: 'fieldDefinitions',
      where: { and: [{ recordType: { equals: 'contact' } }, { key: { equals: NEWSLETTER_FIELD_KEY } }] },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      req: context.req,
    })
    if (existing.docs.length === 0)
      await context.payload.create({
        collection: 'fieldDefinitions',
        data: {
          recordType: 'contact',
          key: NEWSLETTER_FIELD_KEY,
          label: 'Newsletter subscriber',
          type: 'checkbox',
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
    revalidatePath(NEWSLETTER_PATH)
    return actionOk()
  } catch (error) {
    return actionFailure(error, 'enableNewsletter', 'Unable to turn on the newsletter.')
  }
}

async function siteOrigin(): Promise<string> {
  const list = await headers()
  const host = list.get('x-forwarded-host') ?? list.get('host') ?? ''
  return `${list.get('x-forwarded-proto') ?? 'https'}://${host}`
}

/** Sends the message to the signed-in user only (a test), or to every subscriber. */
export async function sendNewsletter(input: unknown): Promise<ActionResult<{ sent: number; failed: number }>> {
  const context = await requireRole('owner', 'manager')
  const parsed = sendSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION', 'Add a subject and a message.')
  if (!(await getOutboundEmailEnabled())) return actionError('UNAVAILABLE', OUTBOUND_EMAIL_DISABLED_MESSAGE)
  try {
    const own = await context.payload.findByID({ collection: 'users', id: String(context.actor.id), depth: 0 })
    const recipients = parsed.data.testOnly
      ? [{ id: String(context.actor.id), email: own.email, name: own.name }]
      : await listSubscribers(await crmDeps())
    const result = await sendCampaign({
      payload: context.payload,
      origin: await siteOrigin(),
      recipients,
      message: { subject: parsed.data.subject, body: parsed.data.body },
    })
    return { ok: true, data: result }
  } catch (error) {
    return actionFailure(
      error,
      'sendNewsletter',
      `Unable to send. At most ${String(MAX_RECIPIENTS_PER_SEND)} go out per send.`,
    )
  }
}
