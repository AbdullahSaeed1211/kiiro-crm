import type { MailSender } from '@ops/platform'
import { isSenderNotVerified } from './send-errors'

/** How `withPlatformSenderFallback` retries a send. */
export interface SenderFallbackOptions {
  /** Platform sender used for the retry, `"{appName} <no-reply@notify.<PLATFORM_DOMAIN>>"` (decision D-41). */
  readonly platformFrom: string
  /** Called once before the retry so the caller can set the tenant's `senderStatus` to `unverified` (spec §14.2). */
  readonly onSenderNotVerified?: () => Promise<void>
}

/**
 * Wraps a sender so a send rejected with `E_SENDER_NOT_VERIFIED` is retried once from the platform sender (spec §14.2).
 * A message already sent from the platform sender is not retried, because the retry could not succeed either.
 * @returns a `MailSender` returning the wrapped sender's errors; when the retry fails, its error is returned.
 */
export function withPlatformSenderFallback(sender: MailSender, options: SenderFallbackOptions): MailSender {
  return {
    send: async (message) => {
      const first = await sender.send(message)
      if (first.ok || !isSenderNotVerified(first.error) || message.from === options.platformFrom) return first
      await options.onSenderNotVerified?.()
      return sender.send({ ...message, from: options.platformFrom })
    },
  }
}
