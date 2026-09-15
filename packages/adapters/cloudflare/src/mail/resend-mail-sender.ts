import { err, ok, type Result } from '@ops/kernel'
import type { MailMessage, MailSender } from '@ops/platform'
import { mapSendError } from './send-errors'

/** Options for the dependency-free Resend fallback. */
export interface ResendMailSenderOptions {
  readonly apiKey: string
  readonly fetcher?: typeof fetch
  readonly timeoutMs?: number
}

/** Sends through Resend without adding an SDK or logging message content. */
export class ResendMailSender implements MailSender {
  constructor(private readonly options: ResendMailSenderOptions) {}
  async send(message: MailMessage): Promise<Result<{ readonly messageId: string }>> {
    if (this.options.apiKey === '') return err(mapSendError(undefined))
    try {
      return await sendRequest(this.options, message)
    } catch (error) {
      return err(mapSendError(error))
    }
  }
}

async function sendRequest(
  options: ResendMailSenderOptions,
  message: MailMessage,
): Promise<Result<{ readonly messageId: string }>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort()
  }, options.timeoutMs ?? 10_000)
  try {
    const response = await (options.fetcher ?? fetch)('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${options.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: message.from,
        to: [...message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(message.attachments === undefined
          ? {}
          : {
              attachments: message.attachments.map((attachment) => ({
                content: attachment.content,
                filename: attachment.filename,
              })),
            }),
        ...(message.replyTo === undefined ? {} : { reply_to: message.replyTo }),
      }),
      signal: controller.signal,
    })
    if (!response.ok) return err(mapSendError({ code: responseCode(response.status) }))
    const data: unknown = await response.json()
    const id = messageIdOf(data)
    return id === undefined ? err(mapSendError({ code: 'E_PROVIDER_ERROR' })) : ok({ messageId: id })
  } finally {
    clearTimeout(timeout)
  }
}

function responseCode(status: number): string {
  return status === 429 ? 'E_RATE_LIMIT_EXCEEDED' : 'E_PROVIDER_ERROR'
}
function messageIdOf(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null || !('id' in data)) return undefined
  const id = data.id
  return typeof id === 'string' ? id : undefined
}
