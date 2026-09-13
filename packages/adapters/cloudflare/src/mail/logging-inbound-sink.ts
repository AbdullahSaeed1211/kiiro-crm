import { createJsonLogger, ok, type Logger } from '@ops/kernel'
import type { InboundEmailSink } from './inbound-sink'

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Sink for environments without mail persistence: logs each message's size and SHA-256 only,
 * because envelopes and content must never reach logs (spec §24).
 * @returns a sink whose `accept` always succeeds.
 */
export function createLoggingInboundSink(logger: Logger = createJsonLogger()): InboundEmailSink {
  return {
    accept: async (email) => {
      logger.info('email.inbound_received', { bytes: email.raw.byteLength, sha256: await sha256Hex(email.raw) })
      return ok(undefined)
    },
  }
}
