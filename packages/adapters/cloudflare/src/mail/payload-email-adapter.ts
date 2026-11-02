import type { MailSender } from '@ops/platform'
import type { ErrorCode } from '@ops/kernel'

/** Safe error surfaced when Payload's mail callback cannot send through the configured transport. */
export class PayloadEmailSendError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly providerCode?: string,
  ) {
    super('Transactional email delivery failed')
    this.name = 'PayloadEmailSendError'
  }
}

/** Options of `payloadEmailAdapter`. */
export interface PayloadEmailAdapterOptions {
  readonly sender: MailSender
  readonly fromAddress: string
  readonly fromName: string
}

function addressOf(entry: unknown): string | undefined {
  if (typeof entry === 'string') return entry
  if (typeof entry === 'object' && entry !== null && 'address' in entry && typeof entry.address === 'string') {
    return entry.address
  }
  return undefined
}

// Payload's message type comes from nodemailer, which this package does not install, so fields are read by key.
function field(message: object, key: string): unknown {
  return (message as Readonly<Record<string, unknown>>)[key]
}

const textOf = (value: unknown): string => (typeof value === 'string' ? value : '')

function plainText(message: object): string {
  const text = textOf(field(message, 'text')).trim()
  if (text !== '') return text
  let output = ''
  let inTag = false
  for (const character of textOf(field(message, 'html'))) {
    if (character === '<') inTag = true
    else if (character === '>') {
      inTag = false
      output += '\n'
    } else if (!inTag) output += character
  }
  return output
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim()
}

/** Extra message headers such as List-Unsubscribe; only string values are forwarded. */
function headersOf(message: object): { headers: Record<string, string> } | undefined {
  const raw = field(message, 'headers')
  if (typeof raw !== 'object' || raw === null) return undefined
  const entries = Object.entries(raw).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  return entries.length === 0 ? undefined : { headers: Object.fromEntries(entries) }
}

/** Payload email adapter over a platform `MailSender` (spec §14.3); a failed send throws. */
export function payloadEmailAdapter(options: PayloadEmailAdapterOptions) {
  const from = `${options.fromName} <${options.fromAddress}>`
  return () => ({
    name: 'cloudflare-email-service',
    defaultFromAddress: options.fromAddress,
    defaultFromName: options.fromName,
    sendEmail: async (message: object) => {
      const to = field(message, 'to')
      const rawAttachments: unknown = field(message, 'attachments')
      const attachments = Array.isArray(rawAttachments)
        ? rawAttachments.flatMap((entry: unknown) => {
            if (typeof entry !== 'object' || entry === null) return []
            const filename = textOf(field(entry, 'filename'))
            const content = field(entry, 'content')
            const contentType = textOf(field(entry, 'contentType'))
            return typeof content === 'string' && filename !== ''
              ? [{ filename, contentType: contentType || 'application/octet-stream', content }]
              : []
          })
        : []
      const result = await options.sender.send({
        from,
        to: (Array.isArray(to) ? to : [to]).map(addressOf).filter((address) => address !== undefined),
        subject: textOf(field(message, 'subject')),
        html: textOf(field(message, 'html')),
        text: plainText(message),
        ...(attachments.length === 0 ? {} : { attachments }),
        ...headersOf(message),
      })
      if (!result.ok) {
        const providerCode = result.error.details?.['providerCode']
        throw new PayloadEmailSendError(
          result.error.code,
          typeof providerCode === 'string' && /^[A-Z0-9_]{1,48}$/.test(providerCode) ? providerCode : undefined,
        )
      }
      return result.value
    },
  })
}
