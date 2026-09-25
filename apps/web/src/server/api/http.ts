import { domainError, err, invalidInput, ok, type ErrorCode, type InputIssue, type Result } from '@ops/kernel'
import { actionError, actionFailure, toActionResult, type ActionResult } from '../action-result'
import { findProductContext, type ProductContext } from '../auth/context'

/** HTTP status of each error code (spec §12.1). */
const HTTP_STATUS: Readonly<Record<ErrorCode, number>> = {
  VALIDATION: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  ALREADY_DONE: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  UNAVAILABLE: 503,
}

/** A zod-compatible schema. */
export interface BodySchema<T> {
  safeParse(value: unknown): { success: true; data: T } | { success: false; error: { issues: readonly InputIssue[] } }
}

/** Sends an action result with the status its outcome maps to. */
function toResponse(result: ActionResult<unknown>, okStatus = 200): Response {
  return Response.json(result, { status: result.ok ? okStatus : HTTP_STATUS[result.error.code] })
}

/** Reads the JSON body and validates it; a failure names each invalid field. */
export async function readBody<T>(request: Request, schema: BodySchema<T>): Promise<Result<T>> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return err(domainError('VALIDATION', 'Send a JSON request body.'))
  }
  const parsed = schema.safeParse(body)
  return parsed.success ? ok(parsed.data) : err(invalidInput('request body is invalid', parsed.error.issues))
}

/** What an API handler receives: the request, its path params, and the signed-in context. */
export interface ApiRequest<P> {
  readonly request: Request
  readonly params: P
  readonly context: ProductContext
}

/**
 * Wraps a route handler: 401 without an active session, the handler's module result mapped to its HTTP status, and
 * an unexpected exception logged and returned as a 500 with generic copy.
 */
export function apiRoute<P extends Record<string, string> = Record<string, never>>(
  handle: (input: ApiRequest<P>) => Promise<Result<unknown>>,
  okStatus = 200,
): (request: Request, route: { params: Promise<P> }) => Promise<Response> {
  return async (request, route) => {
    const context = await findProductContext()
    if (context === null) return Response.json(actionError('FORBIDDEN', 'Sign in to use the API.'), { status: 401 })
    try {
      return toResponse(toActionResult(await handle({ request, params: await route.params, context })), okStatus)
    } catch (error) {
      return toResponse(actionFailure(error, new URL(request.url).pathname, 'The request could not be completed.'))
    }
  }
}
