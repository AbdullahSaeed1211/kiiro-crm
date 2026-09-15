/** The fields of an Email Service `send()` call the platform uses; recipients are plain address strings. */
export interface EmailServiceMessage {
  to: string[]
  from: string
  subject: string
  html: string
  text: string
  replyTo?: string
  headers?: Record<string, string>
  attachments?: { content: string; filename: string; type: string; disposition: 'attachment' }[]
}

/** Result of a successful Email Service `send()` call. */
export interface EmailServiceResult {
  readonly messageId: string
}

/**
 * Structural type of the Workers `send_email` binding, so the adapter does not depend on `@cloudflare/workers-types`.
 * The binding throws an `Error` whose `code` is an Email Service error code when a send fails.
 */
export interface SendEmailBinding {
  send(message: EmailServiceMessage): Promise<EmailServiceResult>
}
