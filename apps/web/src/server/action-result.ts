import { createJsonLogger, type ErrorCode, type Logger, type Result } from '@ops/kernel'

/** A failure a server action returns to the browser: a stable code plus copy that is safe to show. */
export interface ActionError {
  readonly code: ErrorCode
  readonly message: string
  /** Per-field messages for a `VALIDATION` failure, keyed by input field name, so forms can mark the field. */
  readonly fields?: Readonly<Record<string, string>>
}

/** The one result shape every server action returns (spec §12.1). */
export type ActionResult<T = undefined> =
  { readonly ok: true; readonly data: T } | { readonly ok: false; readonly error: ActionError }

const logger: Logger = createJsonLogger()

/** Payload error class names whose messages are written for end users. */
const USER_FACING: Readonly<Record<string, ErrorCode>> = {
  ValidationError: 'VALIDATION',
  Forbidden: 'FORBIDDEN',
  NotFound: 'NOT_FOUND',
}

/** A successful action result. */
export function actionOk(): ActionResult
export function actionOk<T>(data: T): ActionResult<T>
export function actionOk<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data }
}

/** A failed action result with copy written for the user. */
export function actionError(
  code: ErrorCode,
  message: string,
  fields?: Readonly<Record<string, string>>,
): { readonly ok: false; readonly error: ActionError } {
  return { ok: false, error: { code, message, ...(fields === undefined ? {} : { fields }) } }
}

/** Converts a module use-case `Result` into an action result. */
export function toActionResult<T>(result: Result<T>): ActionResult<T> {
  if (result.ok) return { ok: true, data: result.value }
  return actionError(result.error.code, result.error.message, fieldsOf(result.error.details))
}

/** The per-field messages a module attached to a validation error, if any. */
function fieldsOf(details: Readonly<Record<string, unknown>> | undefined): Record<string, string> | undefined {
  const fields = details?.fields
  if (typeof fields !== 'object' || fields === null) return undefined
  const entries = Object.entries(fields).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  return entries.length === 0 ? undefined : Object.fromEntries(entries)
}

/**
 * Converts an unexpected exception into an action result. The exception is logged with `context`; only
 * Payload's user-facing errors pass their message through, and everything else shows `fallback`.
 */
export function actionFailure(
  error: unknown,
  context: string,
  fallback: string,
): { readonly ok: false; readonly error: ActionError } {
  const code = error instanceof Error ? USER_FACING[error.name] : undefined
  if (code !== undefined && error instanceof Error) return actionError(code, error.message)
  logger.error('server action failed', {
    context,
    error: error instanceof Error ? error.message : String(error),
    ...(error instanceof Error && error.stack !== undefined ? { stack: error.stack } : {}),
  })
  return actionError('INTERNAL', fallback)
}
