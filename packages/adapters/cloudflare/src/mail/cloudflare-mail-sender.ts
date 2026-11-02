import { err, ok, type Result } from '@ops/kernel'
import type { MailMessage, MailSender } from '@ops/platform'
import type { EmailServiceAddress, EmailServiceMessage, SendEmailBinding } from './send-email-binding'
import { mapSendError } from './send-errors'

type ParsedAddress =
  Readonly<{ kind: 'plain'; email: string }> | Readonly<{ kind: 'named'; email: string; name: string }>

function validAddress(value: string): boolean {
  const at = value.indexOf('@')
  if (at <= 0 || at !== value.lastIndexOf('@') || at === value.length - 1 || value.length > 254) return false
  const local = value.slice(0, at)
  const domain = value.slice(at + 1)
  return (
    local.length <= 64 &&
    domain.length <= 253 &&
    !/[\s<>]/.test(value) &&
    domain
      .split('.')
      .every((label) => label.length > 0 && label.length <= 63 && !label.startsWith('-') && !label.endsWith('-'))
  )
}

function unescapeName(value: string): string | undefined {
  const quoted = value.startsWith('"') && value.endsWith('"')
  if (quoted) {
    const inner = value.slice(1, -1)
    if (/(^|[^\\])"/.test(inner)) return undefined
    return inner.replaceAll('\\"', '"').replaceAll('\\\\', '\\').trim()
  }
  if (value.includes('"') || value.includes('<') || value.includes('>')) return undefined
  return value.trim()
}

function namedAddress(value: string): ParsedAddress | undefined {
  const open = value.lastIndexOf('<')
  const close = value.lastIndexOf('>')
  if (open <= 0 || close !== value.length - 1 || open > close) return undefined
  const name = unescapeName(value.slice(0, open).trim())
  const email = value.slice(open + 1, close).trim()
  if (name === undefined || name === '' || /[\r\n]/.test(name) || !validAddress(email)) return undefined
  return { kind: 'named', email, name }
}

function addressOf(value: string): ParsedAddress | undefined {
  if (value.includes('<') || value.includes('>')) return namedAddress(value.trim())
  return validAddress(value) ? { kind: 'plain', email: value } : undefined
}

function serviceAddress(address: ParsedAddress): string | EmailServiceAddress {
  return address.kind === 'plain' ? address.email : { email: address.email, name: address.name }
}

function toServiceMessage(message: MailMessage): EmailServiceMessage | undefined {
  const from = addressOf(message.from)
  const replyTo = message.replyTo === undefined ? undefined : addressOf(message.replyTo)
  if (from === undefined || (message.replyTo !== undefined && replyTo === undefined)) return undefined
  return {
    to: [...message.to],
    from: serviceAddress(from),
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
    ...(replyTo === undefined ? {} : { replyTo: serviceAddress(replyTo) }),
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
    const serviceMessage = toServiceMessage(message)
    if (serviceMessage === undefined) return err(mapSendError({ code: 'E_VALIDATION_ERROR' }))
    try {
      const { messageId } = await this.binding.send(serviceMessage)
      return ok({ messageId })
    } catch (error) {
      return err(mapSendError(error))
    }
  }
}
