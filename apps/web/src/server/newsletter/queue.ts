import type { Payload } from 'payload'
import { sendCampaign } from './campaign'
import { AUDIENCES_FIELD_KEY, NEWSLETTER_FIELD_KEY } from './subscribers'
import type { Subscriber } from './types'

/** How many recipients one round sends; the rest wait for the next round, which the schedule runs every 15 minutes. */
const ROUND_SIZE = 150
const LOOKUP_CHUNK = 80
const QUEUE = 'campaignQueue'

interface QueueDoc {
  id: string
  campaignId: string
  subject: string
  body: string
  origin: string
  fromAddress: string
  total: number
  sent: number
  failed: number
  pending?: unknown
}

interface QueueStore {
  find(args: object): Promise<{ docs: QueueDoc[] }>
  create(args: object): Promise<QueueDoc>
  update(args: object): Promise<QueueDoc>
}

const store = (payload: Payload): QueueStore => payload as unknown as QueueStore

const ids = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

/** Puts a campaign on the queue for the contacts with these ids, and returns its id. */
export async function enqueueCampaign(input: {
  readonly payload: Payload
  readonly origin: string
  readonly from: string
  readonly message: { readonly subject: string; readonly body: string }
  readonly recipientIds: readonly string[]
}): Promise<string> {
  const campaignId = crypto.randomUUID()
  await store(input.payload).create({
    collection: QUEUE,
    data: {
      campaignId,
      subject: input.message.subject,
      body: input.message.body,
      origin: input.origin,
      fromAddress: input.from,
      status: 'sending',
      total: input.recipientIds.length,
      sent: 0,
      failed: 0,
      pending: [...input.recipientIds],
    },
    depth: 0,
    overrideAccess: true,
  })
  return campaignId
}

interface ContactRow {
  id: string
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  customData?: Record<string, unknown> | null
}

/** The still-subscribed contacts among these ids; anyone who unsubscribed since the campaign was queued is skipped. */
async function stillSubscribed(payload: Payload, contactIds: readonly string[]): Promise<Subscriber[]> {
  const found: Subscriber[] = []
  for (let from = 0; from < contactIds.length; from += LOOKUP_CHUNK) {
    const chunk = contactIds.slice(from, from + LOOKUP_CHUNK)
    const rows = (await payload.find({
      collection: 'contacts',
      where: { id: { in: chunk } },
      limit: chunk.length,
      pagination: false,
      depth: 0,
      overrideAccess: true,
    })) as unknown as { docs: ContactRow[] }
    for (const row of rows.docs) {
      const data = row.customData ?? {}
      if (data[NEWSLETTER_FIELD_KEY] !== true || typeof row.email !== 'string' || row.email === '') continue
      const audiences = data[AUDIENCES_FIELD_KEY]
      found.push({
        id: row.id,
        email: row.email,
        name: [row.firstName, row.lastName].filter(Boolean).join(' '),
        audiences: Array.isArray(audiences) ? audiences.filter((a): a is string => typeof a === 'string') : [],
      })
    }
  }
  return found
}

/** Sends the next round of one campaign. The round is taken off the list first, so a second run cannot repeat it. */
async function sendRound(payload: Payload, doc: QueueDoc): Promise<{ sent: number; failed: number }> {
  const pending = ids(doc.pending)
  const round = pending.slice(0, ROUND_SIZE)
  const rest = pending.slice(ROUND_SIZE)
  await store(payload).update({
    collection: QUEUE,
    id: doc.id,
    data: { pending: rest, ...(rest.length === 0 ? { status: 'done' } : {}) },
    depth: 0,
    overrideAccess: true,
  })
  const result = await sendCampaign({
    payload,
    origin: doc.origin,
    recipients: await stillSubscribed(payload, round),
    message: { subject: doc.subject, body: doc.body },
    record: { campaignId: doc.campaignId, from: doc.fromAddress },
  })
  await store(payload).update({
    collection: QUEUE,
    id: doc.id,
    data: { sent: doc.sent + result.sent, failed: doc.failed + result.failed },
    depth: 0,
    overrideAccess: true,
  })
  return result
}

/** Sends one round of the oldest campaign still going out, if there is one. */
export async function sendNextRound(payload: Payload): Promise<{ sent: number; failed: number; left: number }> {
  const waiting = await store(payload).find({
    collection: QUEUE,
    where: { status: { equals: 'sending' } },
    sort: 'createdAt',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const doc = waiting.docs.at(0)
  if (doc === undefined) return { sent: 0, failed: 0, left: 0 }
  const result = await sendRound(payload, doc)
  return { ...result, left: Math.max(0, ids(doc.pending).length - ROUND_SIZE) }
}
