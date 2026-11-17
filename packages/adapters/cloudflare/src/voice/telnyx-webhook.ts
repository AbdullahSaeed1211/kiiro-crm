import { decodeBase64, isObject, toArrayBuffer } from './telnyx-utils'

/** Normalized, verified Telnyx webhook event. */
export interface VerifiedTelnyxEvent {
  readonly eventKey: string
  readonly eventType: string
  readonly occurredAt: number
  readonly payload: Record<string, unknown>
}

interface WebhookInput {
  readonly body: Uint8Array
  readonly signature: string | null
  readonly timestamp: string | null
  readonly publicKey: string
  readonly now?: number
}

/** Verify Telnyx's Ed25519 signature over timestamp + raw bytes before parsing or queueing. */
export async function verifyTelnyxWebhook(input: WebhookInput): Promise<VerifiedTelnyxEvent | undefined> {
  const timestamp = acceptedTimestamp(input, input.now ?? Date.now())
  if (timestamp === undefined) return undefined
  const key = await importPublicKey(input.publicKey)
  if (key === undefined || !(await signatureIsValid(input, timestamp, key))) return undefined
  return parseEvent(input.body)
}

function acceptedTimestamp(input: WebhookInput, now: number): string | undefined {
  const timestamp = input.timestamp
  if (input.body.byteLength > 256 * 1024 || input.signature === null || timestamp === null) return undefined
  if (!/^\d{10}$/u.test(timestamp)) return undefined
  const millis = Number(timestamp) * 1000
  return Number.isSafeInteger(millis) && Math.abs(now - millis) <= 5 * 60_000 ? timestamp : undefined
}

async function importPublicKey(value: string): Promise<CryptoKey | undefined> {
  try {
    const raw = decodeBase64(value.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/gu, ''))
    if (raw.byteLength !== 32) return undefined
    return await crypto.subtle.importKey('raw', toArrayBuffer(raw), { name: 'Ed25519' }, false, ['verify'])
  } catch {
    return undefined
  }
}

async function signatureIsValid(input: WebhookInput, timestamp: string, key: CryptoKey): Promise<boolean> {
  const signature = input.signature
  if (signature === null) return false
  try {
    const bytes = decodeBase64(signature)
    if (bytes.byteLength !== 64) return false
    const prefix = new TextEncoder().encode(`${timestamp}|`)
    const message = new Uint8Array(prefix.length + input.body.length)
    message.set(prefix)
    message.set(input.body, prefix.length)
    return await crypto.subtle.verify({ name: 'Ed25519' }, key, toArrayBuffer(bytes), toArrayBuffer(message))
  } catch {
    return false
  }
}

function parseEvent(body: Uint8Array): VerifiedTelnyxEvent | undefined {
  try {
    const data: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body))
    if (!isObject(data) || !isObject(data['data'])) return undefined
    return eventFields(data['data'])
  } catch {
    return undefined
  }
}

function eventFields(event: Record<string, unknown>): VerifiedTelnyxEvent | undefined {
  if (!isObject(event['payload'])) return undefined
  const eventKey = typeof event['id'] === 'string' ? event['id'] : undefined
  const eventType = typeof event['event_type'] === 'string' ? event['event_type'] : undefined
  const occurredAt = typeof event['occurred_at'] === 'string' ? Date.parse(event['occurred_at']) : NaN
  if (eventKey === undefined || eventType === undefined || !Number.isFinite(occurredAt)) return undefined
  return { eventKey, eventType, occurredAt, payload: event['payload'] }
}
