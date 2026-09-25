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

/** One schema problem: where it is in the input and what is wrong. Structurally matches a zod issue. */
export interface InputIssue {
  readonly path: readonly PropertyKey[]
  readonly message: string
}

/** Per-field messages keyed by dotted path (`patch.title`); the first problem per field wins, root problems use `_`. */
export function fieldErrors(issues: readonly InputIssue[]): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const issue of issues) {
    const key = issue.path.length === 0 ? '_' : issue.path.map(String).join('.')
    fields[key] ??= issue.message
  }
  return fields
}

/** A `VALIDATION` error whose `details.fields` names each failing input field. */
export function invalidInput(message: string, issues: readonly InputIssue[]): DomainError {
  return domainError('VALIDATION', message, { fields: fieldErrors(issues) })
}
