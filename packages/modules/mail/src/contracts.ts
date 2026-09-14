type Result<T, E> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E }
type ErrorCode =
  'VALIDATION' | 'NOT_FOUND' | 'FORBIDDEN' | 'CONFLICT' | 'ALREADY_DONE' | 'RATE_LIMITED' | 'UNAVAILABLE' | 'INTERNAL'
export interface DomainError {
  readonly code: ErrorCode
  readonly message: string
  readonly details?: Readonly<Record<string, unknown>>
}
/** Wraps a successful operation. */
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value })
/** Wraps a failed operation. */
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error })
/** Builds a stable domain error. */
export const domainError = (code: ErrorCode, message: string): DomainError => ({ code, message })
export interface MailTransportMessage {
  readonly from: string
  readonly to: readonly string[]
  readonly subject: string
  readonly html: string
  readonly text: string
  readonly replyTo?: string
}
export interface MailTransport {
  send(message: MailTransportMessage): Promise<Result<{ readonly messageId: string }, DomainError>>
}
export interface MailRecordRef {
  readonly type: string
  readonly id: string
}
export interface EmailMessage {
  readonly id: string
  readonly direction: 'outbound' | 'inbound'
  readonly record?: MailRecordRef
  readonly messageId: string
  readonly inReplyTo?: string
  readonly from: string
  readonly to: readonly string[]
  readonly cc: readonly string[]
  readonly subject: string
  readonly textBody: string
  readonly htmlFileKey?: string
  readonly attachmentIds: readonly string[]
  readonly status: 'queued' | 'sent' | 'failed' | 'received' | 'quarantined'
  readonly error?: string
  readonly occurredAt: number
}
/** A decoded MIME attachment produced by the inbound parser. */
export interface ParsedAttachment {
  readonly filename: string
  readonly contentType: string
  readonly bytes: ArrayBuffer
}
export interface ParsedEmail {
  readonly messageId: string
  readonly inReplyTo?: string
  readonly from: string
  readonly to: readonly string[]
  readonly cc: readonly string[]
  readonly subject: string
  readonly textBody: string
  readonly attachments?: readonly ParsedAttachment[]
}
export type InboundDestination =
  | { readonly kind: 'record'; readonly record: MailRecordRef }
  | { readonly kind: 'intake'; readonly formId: string }
  | { readonly kind: 'quarantine' }
export interface RecordAddressing {
  recordAddress(record: MailRecordRef): Promise<string>
  resolveRecord(local: string): Promise<MailRecordRef | undefined>
}
export interface RecordAddressingOptions {
  readonly tenantSecret: string
  readonly inboundDomain: string
  readonly platformDomain?: string
  readonly tenantSlug?: string
}
export interface MailStore {
  findMessageByMessageId(messageId: string): Promise<EmailMessage | undefined>
  createMessage(message: Omit<EmailMessage, 'id'>): Promise<EmailMessage>
  findRecordByAddressToken(token: string): Promise<MailRecordRef | undefined>
  findIntakeFormByAlias(alias: string): Promise<{ readonly id: string; readonly active: boolean } | undefined>
  senderMatchesRecord(sender: string, record: MailRecordRef): Promise<boolean>
  senderMatchesActiveUser(sender: string): Promise<boolean>
  addActivityIfAbsent(input: {
    readonly record: MailRecordRef
    readonly verb: 'email.received'
    readonly messageId: string
    readonly occurredAt: number
  }): Promise<'created' | 'duplicate'>
  notifyIfAbsent(input: {
    readonly record: MailRecordRef
    readonly type: 'email_received'
    readonly messageId: string
  }): Promise<'created' | 'duplicate'>
  releaseMessage(messageId: string, record: MailRecordRef): Promise<Result<undefined, DomainError>>
}
/** Explicit bridge from inbound intake aliases to the intake module's validation/dedupe command. */
export interface InboundIntakePort {
  submit(input: {
    readonly formId: string
    readonly payload: Readonly<Record<string, string>>
    readonly receivedAt: number
  }): Promise<Result<{ readonly status: 'accepted' | 'duplicate'; readonly recordRef?: MailRecordRef }, DomainError>>
}
export interface ReceiveInboundDeps {
  readonly store: MailStore
  readonly addressing: RecordAddressing
  readonly now: number
  readonly envelopeFrom: string
  readonly envelopeTo: string
  readonly raw: ArrayBuffer
  readonly parse?: (raw: ArrayBuffer) => Promise<ParsedEmail>
  readonly intake?: InboundIntakePort
}
export interface ReceiveInboundResult {
  readonly status: 'received' | 'quarantined' | 'duplicate'
  readonly messageId: string
  readonly destination: InboundDestination
}
export interface SystemEmailInput {
  readonly template: TemplateName
  readonly recipient: string
  readonly appName: string
  readonly title: string
  readonly link: string
  readonly actorName?: string
  readonly stageName?: string
  readonly localDate?: string
  readonly days?: number
  readonly sensitive?: boolean
  readonly record?: MailRecordRef
  readonly replyTo?: string
}
export type TemplateName =
  | 'invitation'
  | 'passwordReset'
  | 'assigned'
  | 'mentioned'
  | 'dueSoon'
  | 'overdue'
  | 'digest'
  | 'intakeReceived'
  | 'emailReceived'
  | 'stalled'
export interface RenderedEmail {
  readonly subject: string
  readonly html: string
  readonly text: string
}
