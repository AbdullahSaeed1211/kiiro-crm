import { z } from 'zod'

const MAX_WEBHOOKS = 10
const MIN_SECRET_LENGTH = 16
const EVENT_NAME = /^[a-z]+\.[a-z]+$/u

/** The event a webhook subscribes to when it wants everything. */
export const ALL_EVENTS = '*'

function isPublicHttpsUrl(text: string): boolean {
  try {
    const url = new URL(text)
    return url.protocol === 'https:' && url.username === '' && url.password === '' && url.hostname.includes('.')
  } catch {
    return false
  }
}

/** Where record events are sent: an HTTPS address, a signing secret, and the events wanted. */
export const webhooksSchema = z
  .array(
    z
      .object({
        id: z.string().trim().min(1).max(64),
        name: z.string().trim().min(1).max(80),
        url: z.string().trim().max(500).refine(isPublicHttpsUrl, 'Use a public https:// address.'),
        secret: z.string().min(MIN_SECRET_LENGTH).max(200),
        events: z
          .array(z.union([z.literal(ALL_EVENTS), z.string().regex(EVENT_NAME)]))
          .min(1)
          .max(30),
        active: z.boolean(),
      })
      .strict(),
  )
  .max(MAX_WEBHOOKS)

export type Webhook = z.infer<typeof webhooksSchema>[number]

/** One thing that happened to a record, as sent to a webhook. */
export interface WebhookEvent {
  readonly id: string
  readonly event: string
  readonly occurredAt: string
  readonly recordType: string
  readonly recordId: string
  readonly data: unknown
}

/** The active webhooks that want `event`. */
export function webhooksFor(webhooks: readonly Webhook[], event: string): Webhook[] {
  return webhooks.filter(
    (webhook) => webhook.active && (webhook.events.includes(ALL_EVENTS) || webhook.events.includes(event)),
  )
}

const hex = (bytes: ArrayBuffer): string =>
  [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('')

/**
 * The `X-Webhook-Signature` value: `sha256=` and the HMAC-SHA256, keyed by the webhook's secret, of
 * `<timestamp>.<body>`. A receiver recomputes it and also rejects old timestamps to stop replays.
 */
async function signWebhook(secret: string, timestamp: number, body: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ])
  const signed = encoder.encode(String(timestamp) + '.' + body)
  return 'sha256=' + hex(await crypto.subtle.sign('HMAC', key, signed))
}

export interface DeliveryResult {
  readonly ok: boolean
  readonly status: number | null
  readonly error: string | null
}

const DELIVERY_TIMEOUT_MS = 5000

/** Sends one event to one webhook; never throws, and reports the status or why it could not connect. */
export async function deliverWebhook(
  webhook: Webhook,
  event: WebhookEvent,
  send: typeof fetch = fetch,
): Promise<DeliveryResult> {
  const body = JSON.stringify(event)
  const timestamp = Math.floor(Date.now() / 1000)
  try {
    const response = await send(webhook.url, {
      method: 'POST',
      redirect: 'manual',
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
      headers: {
        'content-type': 'application/json',
        'user-agent': 'ops-platform-webhooks/1',
        'x-webhook-id': event.id,
        'x-webhook-event': event.event,
        'x-webhook-timestamp': String(timestamp),
        'x-webhook-signature': await signWebhook(webhook.secret, timestamp, body),
      },
      body,
    })
    return { ok: response.ok, status: response.status, error: null }
  } catch (error) {
    return { ok: false, status: null, error: error instanceof Error ? error.name : 'Error' }
  }
}

/** One line saying how a delivery went, for the owner who sent a test. */
export function describeDelivery(result: DeliveryResult): string {
  if (result.ok) return 'Delivered (HTTP ' + String(result.status) + ').'
  if (result.status === null) return 'Not delivered: could not connect (' + (result.error ?? 'error') + ').'
  return 'Not delivered: the other system answered HTTP ' + String(result.status) + '.'
}
