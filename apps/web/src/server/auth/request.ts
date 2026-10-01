// Error and request parsing helpers stay dependency-light so route boundary tests do not boot Payload.
import { passwordProblem } from '@ops/module-identity'
// eslint-disable-next-line complexity -- status extraction intentionally handles the complete external error shape.
export function errorResponse(error: unknown, fallback = 'Unable to complete the request.'): Response {
  const candidate =
    typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number'
      ? error.status
      : 500
  const status = [400, 401, 403, 409, 410, 423, 429].includes(candidate) ? candidate : 500
  const message = status === 400 && error instanceof Error ? error.message : fallback
  return Response.json({ error: message }, { status })
}

export function unsupportedContentType(request: Request): Response | undefined {
  return request.headers.get('content-type')?.toLowerCase().includes('application/json') === true
    ? undefined
    : Response.json({ error: 'Content-Type must be application/json.' }, { status: 415 })
}

/** Reads a bounded JSON body so auth endpoints never accept unbounded request data. */
export async function bodyOf(request: Request): Promise<Record<string, unknown> | undefined> {
  const length = request.headers.get('content-length')
  if (length !== null && Number(length) > 16_384) return undefined
  try {
    const text = await request.text()
    if (text.length > 16_384) return undefined
    const value: unknown = JSON.parse(text)
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
    return value as Record<string, unknown>
  } catch {
    return undefined
  }
}

export function passwordPolicyResponse(password: string, email?: string): Response | undefined {
  const problem = passwordProblem(password, email)
  return problem === undefined ? undefined : Response.json({ error: problem }, { status: 400 })
}
