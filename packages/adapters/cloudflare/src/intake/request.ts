/* eslint-disable complexity, max-lines-per-function, max-params, max-statements, @typescript-eslint/no-unnecessary-condition -- request parsing must keep security gates ordered and bounded. */
import { INTAKE_PAYLOAD_MAX_BYTES, isAllowedOrigin, normalizeOrigin } from '../../../../modules/intake/src/domain'
import {
  type IntakeForm,
  type IntakeRateLimiter,
  type IntakeResult,
  type IntakeStore,
  type IntakeTurnstileVerifier,
} from '../../../../modules/intake/src/contracts'
import { submitIntake } from '../../../../modules/intake/src/submit'
import { localDateFormatter } from '../cron/local-date'
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
  readonly turnstileAction?: string
  readonly timeZone: string
  readonly clock?: () => Date
}

function statusOf(code: string): number {
  if (code === 'FORBIDDEN') return 403
  if (code === 'NOT_FOUND') return 404
  if (code === 'RATE_LIMITED') return 429
  return 400
}

function corsHeaders(request: Request, form: IntakeForm): Headers {
  const headers = new Headers({ Vary: 'Origin' })
  const origin = normalizeOrigin(request.headers.get('origin') ?? undefined)
  if (origin !== undefined && isAllowedOrigin(origin, form.allowedOrigins)) {
    headers.set('Access-Control-Allow-Origin', origin)
  }
  return headers
}

function responseHeaders(request: Request, form: IntakeForm, extra?: HeadersInit): Headers {
  const headers = corsHeaders(request, form)
  for (const [key, value] of new Headers(extra)) headers.set(key, value)
  return headers
}

function resultResponse(result: IntakeResult, form: IntakeForm, request: Request, formPost: boolean): Response {
  const headers = responseHeaders(request, form)
  if (result.ok && formPost && form.redirectUrl !== undefined) {
    headers.set('Location', form.redirectUrl)
    return new Response(null, { status: 303, headers })
  }
  if (result.ok) return Response.json({ status: result.value.status, message: form.successMessage }, { headers })
  return Response.json(
    { error: { code: result.error.code, message: result.error.message } },
    { status: statusOf(result.error.code), headers },
  )
}

type BodyResult = { readonly ok: true; readonly payload: unknown } | { readonly ok: false; readonly response: Response }

async function bodyOf(request: Request, form: IntakeForm): Promise<BodyResult> {
  const contentType = (request.headers.get('content-type') ?? '').split(';', 1)[0]?.trim().toLowerCase()
  if (contentType !== 'application/json' && contentType !== 'application/x-www-form-urlencoded') {
    return {
      ok: false,
      response: Response.json(
        { error: { code: 'VALIDATION', message: 'content-type must be JSON or form-urlencoded' } },
        { status: 415, headers: responseHeaders(request, form) },
      ),
    }
  }
  const contentLength = Number(request.headers.get('content-length') ?? '')
  if (Number.isFinite(contentLength) && contentLength > INTAKE_PAYLOAD_MAX_BYTES) {
    return {
      ok: false,
      response: Response.json(
        { error: { code: 'VALIDATION', message: 'intake payload exceeds 16 KB' } },
        { status: 413, headers: responseHeaders(request, form) },
      ),
    }
  }
  const bytes = await boundedBody(request)
  if (bytes === undefined) {
    return {
      ok: false,
      response: Response.json(
        { error: { code: 'VALIDATION', message: 'intake payload exceeds 16 KB' } },
        { status: 413, headers: responseHeaders(request, form) },
      ),
    }
  }
  const text = new TextDecoder().decode(bytes)
  try {
    return {
      ok: true,
      payload: contentType === 'application/json' ? JSON.parse(text) : Object.fromEntries(new URLSearchParams(text)),
    }
  } catch {
    return {
      ok: false,
      response: Response.json(
        { error: { code: 'VALIDATION', message: 'request body is invalid' } },
        { status: 400, headers: responseHeaders(request, form) },
      ),
    }
  }
}

async function boundedBody(request: Request): Promise<ArrayBuffer | undefined> {
  if (request.body === null) return new ArrayBuffer(0)
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) break
      total += next.value.byteLength
      if (total > INTAKE_PAYLOAD_MAX_BYTES) {
        await reader.cancel()
        return undefined
      }
      chunks.push(next.value)
    }
  } finally {
    reader.releaseLock()
  }
  const result = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return result.buffer
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
  return {
    form,
    store: deps.store,
    rateLimiter: deps.rateLimiter,
    now,
    localDate: deps.localDate ?? localDateFormatter(deps.timeZone)(now),
    ...optional('turnstile', deps.turnstile),
    ...optional('origin', header(request, 'origin')),
    ...optional('remoteIp', header(request, 'cf-connecting-ip')),
    ...optional('userAgent', header(request, 'user-agent')),
    ...optional('serverKey', header(request, 'x-intake-key')),
    ...optional(
      'turnstileToken',
      header(request, 'cf-turnstile-response') ?? payloadValue(payload, 'cf-turnstile-response'),
    ),
    ...optional('production', deps.production),
    ...optional('turnstileHostnames', deps.turnstileHostnames),
    ...optional('turnstileAction', deps.turnstileAction),
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

/** Handles only POST and OPTIONS intake requests with bounded JSON/form bodies and allowlisted CORS. */
export async function handleIntakeRequest(request: Request, deps: IntakeRequestDeps): Promise<Response> {
  const form = deps.form
  if (form === undefined) return jsonError(404, { code: 'NOT_FOUND', message: 'intake form not found' })
  if (request.method === 'OPTIONS') {
    const headers = responseHeaders(request, form, {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Intake-Key, CF-Turnstile-Response',
    })
    return new Response(null, { status: headers.has('Access-Control-Allow-Origin') ? 204 : 403, headers })
  }
  if (request.method !== 'POST') {
    return Response.json(
      { error: { code: 'METHOD_NOT_ALLOWED', message: 'method not allowed' } },
      { status: 405, headers: responseHeaders(request, form, { Allow: 'POST, OPTIONS' }) },
    )
  }
  const parsed = await bodyOf(request, form)
  if (!parsed.ok) return parsed.response
  const contentType = (request.headers.get('content-type') ?? '').split(';', 1)[0]?.trim().toLowerCase()
  const result = await submitIntake(commandInput({ request, payload: parsed.payload, form, deps }), parsed.payload)
  return resultResponse(result, form, request, contentType === 'application/x-www-form-urlencoded')
}
