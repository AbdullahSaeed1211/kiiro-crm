import { escapeHtml } from '@ops/module-mail'
import type { Payload } from 'payload'
import { recordSend } from './history'
import type { CampaignMessage, Subscriber } from './types'
import { unsubscribeToken } from './token'

function paragraphs(body: string): string {
  return body
    .split(/\n{2,}/u)
    .map((part) => `<p>${escapeHtml(part.trim()).replaceAll('\n', '<br>')}</p>`)
    .join('')
}

/** One recipient's copy of the campaign, with the unsubscribe link in the footer and the one-click header. */
async function messageFor(input: {
  readonly payload: Payload
  readonly origin: string
  readonly subscriber: Subscriber
  readonly message: CampaignMessage
}) {
  const { payload, origin, subscriber, message } = input
  const link = `${origin}/unsubscribe/${subscriber.id}/${await unsubscribeToken(payload.secret, subscriber.id)}`
  return {
    to: subscriber.email,
    subject: message.subject,
    text: `${message.body}\n\n--\nUnsubscribe: ${link}`,
    html: `${paragraphs(message.body)}<hr><p style="color:#666;font-size:12px"><a href="${link}">Unsubscribe</a></p>`,
    headers: { 'List-Unsubscribe': `<${link}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  }
}

/** Sends the campaign to each subscriber on its own, so one bad address cannot block the rest. */
export async function sendCampaign(input: {
  readonly payload: Payload
  readonly origin: string
  readonly recipients: readonly Subscriber[]
  readonly message: CampaignMessage
  /** When set, each delivered email is also recorded on its contact under this sender address. */
  readonly record?: Readonly<{ campaignId: string; from: string }>
}): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0
  for (const subscriber of input.recipients) {
    try {
      await input.payload.sendEmail(await messageFor({ ...input, subscriber }))
      sent += 1
    } catch (error) {
      console.error('[newsletter.send]', error)
      failed += 1
      continue
    }
    if (input.record !== undefined)
      await recordSend({ ...input.record, payload: input.payload, subscriber, message: input.message }).catch(
        (error: unknown) => {
          console.error('[newsletter.record]', error)
        },
      )
  }
  return { sent, failed }
}
