import config from '@payload-config'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { createRateLimiter, handleIntakeRequest, verifyTurnstile } from '@ops/adapter-cloudflare'
import { createIntakeStore, findIntakeForm, SETTINGS_GLOBAL } from '@ops/adapter-payload'
import { getPayload } from 'payload'

interface RouteContext {
  readonly params: Promise<{ readonly formKey: string }>
}

async function handle(request: Request, context: RouteContext): Promise<Response> {
  const { env } = await getCloudflareContext({ async: true })
  const payload = await getPayload({ config })
  const { formKey } = await context.params
  const [form, settings] = await Promise.all([
    findIntakeForm(payload, 'key', formKey),
    payload.findGlobal({ slug: SETTINGS_GLOBAL, depth: 0, overrideAccess: true }),
  ])
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
