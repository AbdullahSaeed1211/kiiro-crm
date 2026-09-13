import { domainError, err, ok, systemClock, type Clock, type Result } from '@ops/kernel'
import type { Payload } from 'payload'
import { COLLECTIONS } from '../contracts/names'
import { parseHeaders } from './email-headers'
import { insertUnique } from './unique-insert'

// Spec §10.4 caps the stored plain-text body at 200 KB; RFC 5322 caps a header line at 998 characters.
const TEXT_BODY_MAX_BYTES = 200_000
const HEADER_VALUE_MAX = 998

interface InboundMessage {
  readonly envelopeFrom: string
  readonly envelopeTo: string
  readonly raw: ArrayBuffer
}

interface InboundMessageSink {
  accept(email: InboundMessage): Promise<Result<void>>
}

async function contentId(raw: ArrayBuffer): Promise<string> {
  let hex = ''
  for (const byte of new Uint8Array(await crypto.subtle.digest('SHA-256', raw)))
    hex += byte.toString(16).padStart(2, '0')
  return `sha256:${hex}`
}

async function messageIdOf(headers: ReadonlyMap<string, string>, raw: ArrayBuffer): Promise<string> {
  const value = headers.get('message-id') ?? ''
  return value !== '' && value.length <= HEADER_VALUE_MAX ? value : contentId(raw)
}

async function toEmailMessage(email: InboundMessage, occurredAt: number) {
  const textBody = new TextDecoder().decode(email.raw.slice(0, TEXT_BODY_MAX_BYTES))
  const headers = parseHeaders(textBody)
  const subject = headers.get('subject')
  return {
    direction: 'inbound',
    status: 'received',
    messageId: await messageIdOf(headers, email.raw),
    from: email.envelopeFrom,
    to: [email.envelopeTo],
    ...(subject === undefined ? {} : { subject: subject.slice(0, HEADER_VALUE_MAX) }),
    textBody,
    occurredAt,
  }
}

/** Stores inbound mail in `emailMessages` once per Message-ID, structurally the Cloudflare `InboundEmailSink`. */
export function createEmailMessageSink(payload: Payload, clock: Clock = systemClock): InboundMessageSink {
  return {
    accept: async (email) => {
      const data = await toEmailMessage(email, clock.now())
      const insert = { collection: COLLECTIONS.emailMessages, field: 'messageId', value: data.messageId, data }
      try {
        await insertUnique(payload, insert)
        return ok(undefined)
      } catch {
        // The error may quote the envelope or content, which must not reach logs, so it is dropped.
        return err(domainError('INTERNAL', 'inbound message could not be stored'))
      }
    },
  }
}
