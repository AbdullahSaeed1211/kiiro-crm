import config from '@payload-config'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { createRateLimiter, handleIntakeRequest, verifyTurnstile } from '@ops/adapter-cloudflare'
import { createIntakeStore, findIntakeForm, SETTINGS_GLOBAL } from '@ops/adapter-payload'
import { formFieldsSchema } from '@ops/module-intake'
import { getPayload } from 'payload'

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
  const [found, settings] = await Promise.all([
    findIntakeForm(payload, 'key', formKey),
    payload.findGlobal({ slug: SETTINGS_GLOBAL, depth: 0, overrideAccess: true }),
  ])
  const form = await withHostedOrigin(request, found, payload)
  const hostnames = env.TURNSTILE_HOSTNAMES.split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  return handleIntakeRequest(request, {
    form,
    store: createIntakeStore(payload),
    rateLimiter: createRateLimiter(env.RATE_LIMIT_INTAKE),
    turnstile: { verify: (input) => verifyTurnstile(input, { secret: env.TURNSTILE_SECRET }) },
    production: process.env.NODE_ENV === 'production',
    turnstileHostnames: hostnames,
    timeZone: typeof settings.timezone === 'string' ? settings.timezone : 'UTC',
  })
}

/** Public lead-intake endpoint with exact-origin CORS, rate limiting and optional server-key authentication. */
export const POST = handle
export const OPTIONS = handle
