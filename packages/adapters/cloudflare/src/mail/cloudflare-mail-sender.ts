import { err, ok, type Result } from '@ops/kernel'
import type { MailMessage, MailSender } from '@ops/platform'
import type { EmailServiceMessage, SendEmailBinding } from './send-email-binding'
import { mapSendError } from './send-errors'

function toServiceMessage(message: MailMessage): EmailServiceMessage {
  return {
    to: [...message.to],
    from: message.from,
    subject: message.subject,
    html: message.html,
    text: message.text,
    ...(message.attachments === undefined
      ? {}
      : {
          attachments: message.attachments.map((attachment) => ({
            content: attachment.content,
            filename: attachment.filename,
            type: attachment.contentType,
            disposition: 'attachment' as const,
          })),
        }),
    ...(message.replyTo === undefined ? {} : { replyTo: message.replyTo }),
    ...(message.headers === undefined ? {} : { headers: { ...message.headers } }),
  }
}

/** `MailSender` over the Cloudflare Email Service `send_email` binding (decision D-23). */
export class CloudflareMailSender implements MailSender {
  private readonly binding: SendEmailBinding

  /** @param binding the tenant Worker's `EMAIL` binding. */
  constructor(binding: SendEmailBinding) {
    this.binding = binding
  }

  /**
   * Sends one message through Email Service; exceptions from the binding are returned as errors.
   * @returns the provider message id, or `RATE_LIMITED`, `VALIDATION` or `UNAVAILABLE` as mapped by `mapSendError`.
   */
  async send(message: MailMessage): Promise<Result<{ readonly messageId: string }>> {
    try {
      const { messageId } = await this.binding.send(toServiceMessage(message))
      return ok({ messageId })
    } catch (error) {
      return err(mapSendError(error))
    }
  }
}
