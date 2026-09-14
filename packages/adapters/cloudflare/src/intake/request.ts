import {
  type IntakeForm,
  type IntakeRateLimiter,
  type IntakeResult,
  type IntakeStore,
  type IntakeTurnstileVerifier,
} from '../../../../modules/intake/src/contracts'
import { submitIntake } from '../../../../modules/intake/src/submit'
import { jsonError } from '../internal/responses'

/** Dependencies for a public intake route. */
export interface IntakeRequestDeps {
  readonly form: IntakeForm | undefined
  readonly store: IntakeStore
  readonly rateLimiter: IntakeRateLimiter
  readonly turnstile?: IntakeTurnstileVerifier
  readonly now?: number
  readonly localDate?: string
  readonly production?: boolean
  readonly turnstileHostnames?: readonly string[]
  readonly clock?: () => Date
}
function statusOf(code: string): number {
  if (code === 'FORBIDDEN') return 403
  if (code === 'NOT_FOUND') return 404
  if (code === 'RATE_LIMITED') return 429
  return 400
}
function resultResponse(result: IntakeResult, form: IntakeForm): Response {
  return result.ok
    ? Response.json({ status: result.value.status, message: form.successMessage })
    : jsonError(statusOf(result.error.code), result.error)
}
async function bodyOf(request: Request): Promise<unknown> {
  const type = request.headers.get('content-type') ?? ''
  if (type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data'))
    return Object.fromEntries((await request.formData()).entries())
  return request.json().catch(() => undefined)
}
function header(request: Request, name: string): string | undefined {
  const value = request.headers.get(name)
  return value ?? undefined
}
function commandInput(input: {
  readonly request: Request
  readonly payload: unknown
  readonly form: IntakeForm
  readonly deps: IntakeRequestDeps
}): Parameters<typeof submitIntake>[0] {
  const { request, payload, form, deps } = input
  const now = deps.clock?.().getTime() ?? deps.now ?? Date.now()
  const token = header(request, 'cf-turnstile-response') ?? payloadValue(payload, 'cf-turnstile-response')
  return {
    form,
    store: deps.store,
    rateLimiter: deps.rateLimiter,
    now,
    localDate: deps.localDate ?? new Date(now).toISOString().slice(0, 10),
    ...optional('turnstile', deps.turnstile),
    ...optional('origin', header(request, 'origin')),
    ...optional('remoteIp', header(request, 'cf-connecting-ip')),
    ...optional('userAgent', header(request, 'user-agent')),
    ...optional('serverKey', header(request, 'x-intake-key')),
    ...optional('turnstileToken', token),
    ...optional('production', deps.production),
    ...optional('turnstileHostnames', deps.turnstileHostnames),
  }
}
function optional(key: string, value: unknown): Record<string, unknown> {
  return value === undefined ? {} : { [key]: value }
}
function payloadValue(payload: unknown, key: string): string | undefined {
  if (typeof payload !== 'object' || payload === null || !(key in payload)) return undefined
  const value = (payload as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : undefined
}
/** Parses JSON or form input and delegates security checks to the intake module. */
export async function handleIntakeRequest(request: Request, deps: IntakeRequestDeps): Promise<Response> {
  if (request.method === 'OPTIONS')
    return Response.json(
      {},
      {
        headers: {
          'access-control-allow-methods': 'POST, OPTIONS',
          'access-control-allow-headers': 'content-type, x-intake-key, cf-turnstile-response',
        },
      },
    )
  const form = deps.form
  if (form === undefined) return jsonError(404, { code: 'NOT_FOUND', message: 'intake form not found' })
  const payload = await bodyOf(request)
  const result = await submitIntake(commandInput({ request, payload, form, deps }), payload)
  return resultResponse(result, form)
}
