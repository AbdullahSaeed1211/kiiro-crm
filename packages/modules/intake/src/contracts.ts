type ErrorCode =
  'VALIDATION' | 'NOT_FOUND' | 'FORBIDDEN' | 'CONFLICT' | 'ALREADY_DONE' | 'RATE_LIMITED' | 'UNAVAILABLE' | 'INTERNAL'
export interface DomainError {
  readonly code: ErrorCode
  readonly message: string
  readonly details?: Readonly<Record<string, unknown>>
}
export type Result<T, E = never> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E }
/** Builds a stable domain error. */
export const domainError = (code: ErrorCode, message: string): DomainError => ({ code, message })
/** Wraps a successful operation. */
export const ok = <T>(value: T): Result<T> => ({ ok: true, value })
/** Wraps a failed operation. */
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error })

/** A configured public form that creates leads. */
export interface IntakeForm {
  readonly id: string
  readonly key: string
  readonly name: string
  readonly active: boolean
  readonly targetRecordType: 'lead'
  readonly fieldMap: Readonly<Record<string, string>>
  readonly allowedOrigins: readonly string[]
  readonly requireTurnstile: boolean
  readonly serverKeyHashes: readonly string[]
  readonly defaultOwnerId?: string
  readonly defaultAssigneeIds: readonly string[]
  readonly defaultSourceId?: string
  readonly notifyUserIds: readonly string[]
  readonly notifyGroupIds: readonly string[]
  readonly successMessage: string
  readonly redirectUrl?: string
  readonly emailAlias?: string
}
/** Submission state persisted for dedupe and abuse review. */
export type IntakeSubmissionStatus = 'accepted' | 'duplicate' | 'rejected_spam' | 'rejected_invalid'
/** The public channels accepted by the intake command. */
export type IntakeChannel = 'web' | 'server' | 'email'
/** A bounded, JSON-compatible intake payload. */
export type IntakePayload = Readonly<Record<string, unknown>>
/** A persisted intake submission. */
export interface IntakeSubmission {
  readonly id: string
  readonly formId: string
  readonly channel: IntakeChannel
  readonly receivedAt: number
  readonly origin: string
  readonly ipHash: string
  readonly userAgent: string
  readonly payload: IntakePayload
  readonly dedupeKey: string
  readonly status: IntakeSubmissionStatus
  readonly recordRef?: { readonly type: 'lead'; readonly id: string }
}
/** Persistence and side effects required by `submitIntake`. */
export interface IntakeStore {
  findByDedupeKey(dedupeKey: string): Promise<IntakeSubmission | undefined>
  insertSubmission(submission: Omit<IntakeSubmission, 'id'>): Promise<Result<IntakeSubmission, DomainError>>
  markDuplicate(dedupeKey: string, recordRef?: IntakeSubmission['recordRef']): Promise<void>
  createLead(input: Readonly<Record<string, unknown>>): Promise<{ readonly id: string }>
  addComment(input: {
    readonly record: { readonly type: 'lead'; readonly id: string }
    readonly body: string
  }): Promise<void>
  notify(input: {
    readonly userIds: readonly string[]
    readonly groupIds: readonly string[]
    readonly record: { readonly type: 'lead'; readonly id: string }
    readonly title: string
  }): Promise<void>
}
/** Turnstile verification boundary. */
export interface IntakeTurnstileVerifier {
  verify(input: {
    readonly token: string
    readonly remoteIp?: string
    readonly allowedHostnames: readonly string[]
    readonly action: string
  }): Promise<boolean>
}
/** Rate-limit boundary. */
export interface IntakeRateLimiter {
  check(key: string): Promise<boolean>
}
/** Dependencies for one intake request. */
export interface SubmitIntakeDeps {
  readonly form: IntakeForm
  readonly store: IntakeStore
  readonly rateLimiter: IntakeRateLimiter
  readonly turnstile?: IntakeTurnstileVerifier
  readonly now: number
  readonly localDate: string
  readonly origin?: string
  readonly remoteIp?: string
  readonly userAgent?: string
  readonly serverKey?: string
  readonly turnstileToken?: string
  readonly production?: boolean
  readonly turnstileHostnames?: readonly string[]
  readonly turnstileAction?: string
  readonly channel?: IntakeChannel
}
/** Successful command result. */
export interface IntakeAccepted {
  readonly status: 'accepted' | 'duplicate'
  readonly message: string
  readonly recordRef?: IntakeSubmission['recordRef']
}
/** Result returned by the submit command. */
export type IntakeResult = Result<IntakeAccepted, DomainError>
