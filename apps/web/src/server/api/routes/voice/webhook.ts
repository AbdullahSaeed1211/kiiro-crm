import { getCloudflareContext } from '@opennextjs/cloudflare'
import { verifyTelnyxWebhook, type VerifiedTelnyxEvent } from '@ops/adapter-cloudflare'
import { createSystemVoiceRepository } from '@ops/adapter-payload'
import type { VoiceEvent } from '@ops/module-crm'
import { getPayload } from 'payload'
import config from '@payload-config'

const MAX_WEBHOOK_BYTES = 256 * 1024

/** Accepts only a fresh Telnyx Ed25519 event, persists the deduplicated inbox row, then enqueues processing. */
export async function POST(request: Request): Promise<Response> {
  const { env } = await getCloudflareContext({ async: true })
  if (env.VOICE_MODE !== 'telnyx' || !env.TELNYX_PUBLIC_KEY)
    return Response.json({ error: 'Voice webhook is unavailable.' }, { status: 503 })
  const body = await readBoundedBody(request, MAX_WEBHOOK_BYTES)
  if (body === undefined) return Response.json({ error: 'Invalid webhook body.' }, { status: 413 })
  const event = await verifyTelnyxWebhook({
    body,
    signature: request.headers.get('telnyx-signature-ed25519'),
    timestamp: request.headers.get('telnyx-timestamp'),
    publicKey: env.TELNYX_PUBLIC_KEY,
  })
  if (event === undefined) return Response.json({ error: 'Invalid provider signature.' }, { status: 401 })
  await persistEvent(event)
  if (env.VOICE_EVENTS === undefined)
    return Response.json({ error: 'Voice event processing is unavailable.' }, { status: 503 })
  try {
    await env.VOICE_EVENTS.send({ kind: 'events' })
  } catch {
    return Response.json({ error: 'Voice event processing is temporarily unavailable.' }, { status: 503 })
  }
  return new Response('OK', { status: 200 })
}

async function persistEvent(event: VerifiedTelnyxEvent): Promise<void> {
  const payload = await getPayload({ config })
  const repository = await createSystemVoiceRepository(payload)
  const now = Date.now()
  const row: VoiceEvent = {
    id: crypto.randomUUID(),
    eventKey: event.eventKey,
    kind: event.eventType,
    occurredAt: event.occurredAt,
    receivedAt: now,
    payload: event.payload,
    status: 'pending',
    attempts: 0,
    leaseUntil: null,
    error: null,
  }
  await repository.enqueueEvent(row)
}

async function readBoundedBody(request: Request, limit: number): Promise<Uint8Array | undefined> {
  const contentLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > limit) return undefined
  if (request.body === null) return new Uint8Array()
  return readStream(request.body.getReader(), limit)
}

async function readStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  limit: number,
): Promise<Uint8Array | undefined> {
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    let part = await reader.read()
    while (!part.done) {
      size += part.value.byteLength
      if (size > limit) {
        await reader.cancel()
        return undefined
      }
      chunks.push(part.value)
      part = await reader.read()
    }
    return concatenate(chunks, size)
  } finally {
    reader.releaseLock()
  }
}

function concatenate(chunks: readonly Uint8Array[], size: number): Uint8Array {
  const result = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return result
}
