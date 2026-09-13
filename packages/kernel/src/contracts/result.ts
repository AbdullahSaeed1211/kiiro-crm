/** Error categories shared by every layer; HTTP and UI mappings live in spec §12.1. */
export type ErrorCode =
  'VALIDATION' | 'NOT_FOUND' | 'FORBIDDEN' | 'CONFLICT' | 'ALREADY_DONE' | 'RATE_LIMITED' | 'UNAVAILABLE' | 'INTERNAL'

/** A failure returned across layer boundaries instead of throwing. */
export interface DomainError {
  readonly code: ErrorCode
  readonly message: string
  readonly details?: Readonly<Record<string, unknown>>
}

/** Success or failure of an operation; exceptions never cross layer boundaries. */
export type Result<T, E = DomainError> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E }

/** Opaque identifier; persisted ids come from the database adapter, non-persisted ids from `newId()`. */
export type Id = string & { readonly __brand: 'Id' }

/** Source of the current time in epoch milliseconds. */
export interface Clock {
  now(): number
}

/** Structured log fields; values are redacted by key before output. */
export type LogFields = Readonly<Record<string, unknown>>

/** Structured logger port. */
export interface Logger {
  debug(message: string, fields?: LogFields): void
  info(message: string, fields?: LogFields): void
  warn(message: string, fields?: LogFields): void
  error(message: string, fields?: LogFields): void
}
