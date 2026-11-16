import config from '@payload-config'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { createRateLimiter, handleIntakeRequest, verifyTurnstile } from '@ops/adapter-cloudflare'
import { createIntakeStore, findIntakeForm, SETTINGS_GLOBAL } from '@ops/adapter-payload'
import { formFieldsSchema, isAllowedOrigin, normalizeOrigin, sha256Hex } from '@ops/module-intake'
import { getPayload } from 'payload'
import { captureIntakeSubmission, parsePublicSubmission } from '../public-recording'
import { persistIntakeRecording } from '../public-recording-store'

interface RouteContext {
  readonly params: Promise<{ readonly formKey: string }>
}

/**
 * A form with questions is also hosted by this app, and its page posts from the app's own origin. That origin is
 * allowed for such a form without being listed. In production the page shows a Turnstile widget and the token is
 * verified like any other submission; outside production the check is skipped so the form can be tried locally.
 */
async function withHostedOrigin(
  request: Request,
  form: Awaited<ReturnType<typeof findIntakeForm>>,
  payload: Awaited<ReturnType<typeof getPayload>>,
) {
  const appOrigin = new URL(request.url).origin
  if (form === undefined || request.headers.get('origin') !== appOrigin) return form
  const found = await payload.find({
    collection: 'intakeForms',
    where: { id: { equals: form.id } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const questions = formFieldsSchema.safeParse(found.docs.at(0)?.formFields ?? [])
  const hosted = questions.success && questions.data.length > 0
  if (!hosted) return form
  const allowedOrigins = [...form.allowedOrigins, appOrigin]
  return process.env.NODE_ENV === 'production'
    ? { ...form, allowedOrigins }
    : { ...form, allowedOrigins, requireTurnstile: false }
}

async function handle(request: Request, context: RouteContext): Promise<Response> {
  const { env } = await getCloudflareContext({ async: true })
  const payload = await getPayload({ config })
  const { formKey } = await context.params
  const [found, settings] = await loadFormAndSettings(payload, formKey)
  const form = await withHostedOrigin(request, found, payload)
  const rateLimiter = createRateLimiter(env.RATE_LIMIT_INTAKE)
  const preflight = await multipartPreflight(request, form, rateLimiter)
  if (preflight !== null) return preflight
  const parsed = await parsePublicSubmission(request, form)
  if (!parsed.ok) return intakeError({ request, form, status: parsed.status, message: parsed.message })
  return processParsedSubmission({ request, parsed, env, form, settings, payload, rateLimiter })
}

async function processParsedSubmission(input: {
  request: Request
  parsed: Extract<Awaited<ReturnType<typeof parsePublicSubmission>>, { ok: true }>
  env: CloudflareEnv
  form: Awaited<ReturnType<typeof findIntakeForm>>
  settings: Awaited<ReturnType<typeof loadFormAndSettings>>[1]
  payload: Awaited<ReturnType<typeof getPayload>>
  rateLimiter: ReturnType<typeof createRateLimiter>
}): Promise<Response> {
  const { request, parsed, env, form, settings, payload, rateLimiter } = input
  const uploader = parsed.recording === undefined ? undefined : await activeDefaultOwner(payload, form)
  if (parsed.recording !== undefined && uploader === undefined)
    return intakeError({ request, form, status: 503, message: 'Call recording is not available for this form.' })
  const hostnames = env.TURNSTILE_HOSTNAMES.split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  const capture: { submissionId?: string; leadId?: string } = {}
  const response = await handleIntakeRequest(
    parsed.request,
    intakeDependencies({ env, form, settings, payload, capture, rateLimiter, hostnames }),
  )
  return finishIntakeResponse({ request, form, parsed, response, env, payload, uploader, capture })
}

async function finishIntakeResponse(input: {
  request: Request
  form: Awaited<ReturnType<typeof findIntakeForm>>
  parsed: Extract<Awaited<ReturnType<typeof parsePublicSubmission>>, { ok: true }>
  response: Response
  env: CloudflareEnv
  payload: Awaited<ReturnType<typeof getPayload>>
  uploader: Record<string, unknown> | undefined
  capture: { submissionId?: string; leadId?: string }
}): Promise<Response> {
  const { request, form, parsed, response, env, payload, uploader, capture } = input
  if (parsed.recording === undefined || !response.ok) return response
  if (uploader === undefined || capture.submissionId === undefined || capture.leadId === undefined)
    return retryRecordingResponse(request, form)
  try {
    await persistIntakeRecording({
      payload,
      bucket: env.R2,
      recording: parsed.recording,
      submissionId: capture.submissionId,
      leadId: capture.leadId,
      uploader,
    })
    return response
  } catch (error) {
    console.error('public intake recording attachment failed', error)
    return retryRecordingResponse(request, form)
  }
}

function retryRecordingResponse(request: Request, form: Awaited<ReturnType<typeof findIntakeForm>>): Response {
  return intakeError({
    request,
    form,
    status: 503,
    message: 'The call recording could not be attached. Retry this same form submission.',
  })
}

async function loadFormAndSettings(payload: Awaited<ReturnType<typeof getPayload>>, key: string) {
  return Promise.all([
    findIntakeForm(payload, 'key', key),
    payload.findGlobal({ slug: SETTINGS_GLOBAL, depth: 0, overrideAccess: true }),
  ])
}

async function multipartPreflight(
  request: Request,
  form: Awaited<ReturnType<typeof findIntakeForm>>,
  limiter: ReturnType<typeof createRateLimiter>,
): Promise<Response | null> {
  if (!isMultipartRequest(request)) return null
  if (form?.active !== true) return intakeError({ request, form, status: 404, message: 'intake form not found' })
  return consumeMultipartQuota(request, form, limiter)
}

function isMultipartRequest(request: Request): boolean {
  return (request.headers.get('content-type') ?? '').split(';', 1)[0]?.trim().toLowerCase() === 'multipart/form-data'
}

async function consumeMultipartQuota(
  request: Request,
  form: NonNullable<Awaited<ReturnType<typeof findIntakeForm>>>,
  limiter: ReturnType<typeof createRateLimiter>,
): Promise<Response | null> {
  const origin = normalizeOrigin(request.headers.get('origin') ?? undefined)
  if (origin === undefined || !isAllowedOrigin(origin, form.allowedOrigins))
    return intakeError({ request, form, status: 403, message: 'origin is not allowed' })
  const ip = request.headers.get('cf-connecting-ip') ?? ''
  const allowed = await limiter.check(`${await sha256Hex(ip)}:${form.key}:upload`)
  return allowed ? null : intakeError({ request, form, status: 429, message: 'too many intake submissions' })
}

async function activeDefaultOwner(
  payload: Awaited<ReturnType<typeof getPayload>>,
  form: Awaited<ReturnType<typeof findIntakeForm>>,
): Promise<Record<string, unknown> | undefined> {
  if (form?.defaultOwnerId === undefined) return undefined
  try {
    const owner = await payload.findByID({
      collection: 'users',
      id: form.defaultOwnerId,
      depth: 0,
      overrideAccess: true,
    })
    return owner.active === true ? (owner as unknown as Record<string, unknown>) : undefined
  } catch {
    return undefined
  }
}

function intakeDependencies(input: {
  env: CloudflareEnv
  form: Awaited<ReturnType<typeof findIntakeForm>>
  settings: Awaited<ReturnType<typeof loadFormAndSettings>>[1]
  payload: Awaited<ReturnType<typeof getPayload>>
  capture: { submissionId?: string; leadId?: string }
  rateLimiter: ReturnType<typeof createRateLimiter>
  hostnames: string[]
}) {
  return {
    form: input.form,
    store: captureIntakeSubmission(createIntakeStore(input.payload), input.capture),
    rateLimiter: input.rateLimiter,
    turnstile: {
      verify: (data: Parameters<typeof verifyTurnstile>[0]) =>
        verifyTurnstile(data, { secret: input.env.TURNSTILE_SECRET }),
    },
    production: process.env.NODE_ENV === 'production',
    turnstileHostnames: input.hostnames,
    timeZone: typeof input.settings.timezone === 'string' ? input.settings.timezone : 'UTC',
  }
}

function intakeError(input: {
  request: Request
  form: Awaited<ReturnType<typeof findIntakeForm>>
  status: number
  message: string
}) {
  const { request, form, status, message } = input
  const headers = new Headers({ Vary: 'Origin' })
  const origin = request.headers.get('origin')
  const normalized = normalizeOrigin(origin ?? undefined)
  if (
    origin !== null &&
    form !== undefined &&
    normalized !== undefined &&
    isAllowedOrigin(normalized, form.allowedOrigins)
  )
    headers.set('Access-Control-Allow-Origin', origin)
  return Response.json({ error: message }, { status, headers })
}

/** Public lead-intake endpoint with exact-origin CORS, rate limiting and optional server-key authentication. */
export const POST = handle
export const OPTIONS = handle
