import type { MailSender } from '@ops/platform'

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
        text: textOf(field(message, 'text')),
        ...(attachments.length === 0 ? {} : { attachments }),
        ...headersOf(message),
      })
      if (!result.ok) throw new Error(`Email send failed (${result.error.code})`)
      return result.value
    },
  })
}
