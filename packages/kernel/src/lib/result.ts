import type { DomainError, ErrorCode, Result } from '../contracts/result'

/** Wraps a successful value. */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value }
}

/** Wraps a failure. */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error }
}

/** Builds a domain error with an optional details object. */
export function domainError(code: ErrorCode, message: string, details?: Record<string, unknown>): DomainError {
  return details === undefined ? { code, message } : { code, message, details }
}

/** Narrows a result to its success branch. */
export function isOk<T, E>(result: Result<T, E>): result is { readonly ok: true; readonly value: T } {
  return result.ok
}
