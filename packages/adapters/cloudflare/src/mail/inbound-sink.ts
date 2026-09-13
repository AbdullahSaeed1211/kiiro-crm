import type { Result } from '@ops/kernel'

/** A raw inbound message with its SMTP envelope, as forwarded by `bridgeInboundEmail`. */
export interface InboundEmail {
  readonly envelopeFrom: string
  readonly envelopeTo: string
  readonly raw: ArrayBuffer
}

/**
 * Receives messages from the internal inbound route.
 * Email Routing can deliver a message more than once, so implementations must accept repeats without duplicating work.
 */
export interface InboundEmailSink {
  accept(email: InboundEmail): Promise<Result<void>>
}
