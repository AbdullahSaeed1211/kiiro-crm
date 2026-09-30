import type { Payload } from 'payload'
import type { CampaignMessage, Subscriber } from './types'

/** Newsletter emails are stored as outbound email rows whose message id starts with this tag. */
const CAMPAIGN_TAG = 'newsletter:'
const HISTORY_ROWS = 500
const HISTORY_SHOWN = 10

export type CampaignSummary = Readonly<{ id: string; subject: string; sentAt: number; recipients: number }>

/** Records one delivered newsletter on the contact, so it shows in their Email tab and in the campaign list. */
export async function recordSend(input: {
  readonly payload: Payload
  readonly campaignId: string
  readonly from: string
  readonly subscriber: Subscriber
  readonly message: CampaignMessage
}): Promise<void> {
  const { payload, campaignId, from, subscriber, message } = input
  await payload.create({
    collection: 'emailMessages',
    data: {
      direction: 'outbound',
      recordType: 'contact',
      recordId: subscriber.id,
      messageId: `${CAMPAIGN_TAG}${campaignId}:${subscriber.id}`,
      from,
      to: [subscriber.email],
      cc: [],
      subject: message.subject,
      textBody: message.body,
      attachments: [],
      status: 'sent',
      occurredAt: Date.now(),
    },
    depth: 0,
    // The collection is system-write-only; the caller is an owner or manager sending the campaign.
    overrideAccess: true,
  })
}

/** The most recent campaigns, newest first, counted from the per-recipient rows. */
export async function listCampaigns(payload: Payload): Promise<CampaignSummary[]> {
  const rows = await payload.find({
    collection: 'emailMessages',
    where: { messageId: { like: CAMPAIGN_TAG } },
    sort: '-occurredAt',
    limit: HISTORY_ROWS,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const campaigns = new Map<string, { subject: string; sentAt: number; recipients: number }>()
  for (const row of rows.docs) {
    const id = row.messageId.slice(CAMPAIGN_TAG.length).split(':')[0] ?? ''
    const known = campaigns.get(id)
    if (known === undefined) campaigns.set(id, { subject: row.subject ?? '', sentAt: row.occurredAt, recipients: 1 })
    else known.recipients += 1
  }
  return [...campaigns].slice(0, HISTORY_SHOWN).map(([id, campaign]) => ({ id, ...campaign }))
}
