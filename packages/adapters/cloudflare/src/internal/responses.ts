import type { DomainError, ErrorCode } from '@ops/kernel'

const STATUS_BY_CODE: Readonly<Record<ErrorCode, number>> = {
  VALIDATION: 400,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  CONFLICT: 409,
  ALREADY_DONE: 409,
  RATE_LIMITED: 429,
  UNAVAILABLE: 503,
  INTERNAL: 500,
}

/** Error body of internal routes; the message never carries request content. */
export interface ErrorBody {
  readonly code: string
  readonly message: string
}

/** JSON response `{ error: { code, message } }` with the given HTTP status. */
export function jsonError(status: number, error: ErrorBody): Response {
  return Response.json({ error: { code: error.code, message: error.message } }, { status })
}

/** JSON error response with the status spec §12.1 assigns to the error's code; `details` are dropped as internal. */
export function domainErrorResponse(error: DomainError): Response {
  return jsonError(STATUS_BY_CODE[error.code], error)
}
