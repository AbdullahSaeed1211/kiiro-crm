import { createJsonLogger } from '@ops/kernel'
import { INTERNAL_ROUTES, type InboundEmailMessage, type InternalForwardEnv } from '../contracts/worker'
import { postInternal } from './post-internal'

/** Largest raw message accepted, matching the Email Routing limit (spec §14.4). */
export const MAX_INBOUND_BYTES = 25 * 1024 * 1024

const logger = createJsonLogger()

/**
 * Reads the single-use raw stream once and forwards it with envelope headers to the internal inbound route.
 * Oversized messages and messages the route does not accept are rejected, so the sender gets a bounce instead of silent loss.
 */
export async function bridgeInboundEmail(env: InternalForwardEnv, message: InboundEmailMessage): Promise<void> {
  if (message.rawSize > MAX_INBOUND_BYTES) {
    message.setReject('Message too large')
    return
  }
  const body = await new Response(message.raw).arrayBuffer()
  const headers = { 'x-envelope-from': message.from, 'x-envelope-to': message.to }
  const response = await postInternal(env, INTERNAL_ROUTES.inboundEmail, {
    body,
    contentType: 'message/rfc822',
    headers,
  })
  if (response.ok) return
  logger.error('email.inbound_forward_failed', { status: response.status })
  message.setReject('Unable to accept message')
}
