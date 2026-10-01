import type { ErrorCode } from '@ops/kernel'

/** HTTP status of each error code (spec §12.1). */
export const HTTP_STATUS: Readonly<Record<ErrorCode, number>> = {
  VALIDATION: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  ALREADY_DONE: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  UNAVAILABLE: 503,
}

/** A successful JSON response: `{ ok: true, data }`. */
export function success(data: unknown, status = 200): Response {
  return Response.json({ ok: true, data }, { status })
}

/**
 * A failed JSON response: `{ ok: false, error: { code, message, fields? } }`. The status comes from the code unless
 * the caller needs another one, such as 410 for an expired link or 502 when an upstream service refused.
 */
export function failure(
  code: ErrorCode,
  message: string,
  options: { readonly status?: number; readonly fields?: Readonly<Record<string, string>> } = {},
): Response {
  const error = { code, message, ...(options.fields === undefined ? {} : { fields: options.fields }) }
  return Response.json({ ok: false, error }, { status: options.status ?? HTTP_STATUS[code] })
}
