import config from '@payload-config'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { createRateLimiter, handleInboundEmailRequest, rejectUnauthorized } from '@ops/adapter-cloudflare'
import { createInboundMailSink } from '@ops/adapter-payload'
import { getPayload } from 'payload'

interface MailSettings {
  readonly email?: {
    readonly inboundDomain?: string | null
    readonly inboundLocalPrefix?: string | null
  }
  readonly timezone?: string | null
}

// The option builder validates configured settings and selects the platform-hosted addressing shape.
// eslint-disable-next-line complexity -- the option builder keeps tenant defaults and platform addressing in one boundary.
function inboundOptions(settings: MailSettings, env: CloudflareEnv) {
  const emailSettings = settings.email ?? {}
  const inboundDomain =
    typeof emailSettings.inboundDomain === 'string' && emailSettings.inboundDomain !== ''
      ? emailSettings.inboundDomain
      : env.INBOUND_DOMAIN
  const platformDomain =
    typeof emailSettings.inboundLocalPrefix === 'string' &&
    emailSettings.inboundLocalPrefix !== '' &&
    env.INBOUND_DOMAIN.startsWith('in.')
      ? env.INBOUND_DOMAIN.slice(3)
      : undefined
  return {
    tenantSecret: env.TENANT_SECRET,
    inboundDomain,
    ...(platformDomain === undefined ? {} : { platformDomain, tenantSlug: env.TENANT_SLUG }),
    timeZone: typeof settings.timezone === 'string' ? settings.timezone : 'UTC',
    intakeRateLimiter: createRateLimiter(env.RATE_LIMIT_INTAKE),
  }
}

/** Receives raw inbound email and composes the tenant mail domain (spec §14.4). */
export async function POST(request: Request): Promise<Response> {
  const { env } = await getCloudflareContext({ async: true })
  // Authenticate before touching the database.
  const unauthorized = await rejectUnauthorized(request, env.INTERNAL_SECRET)
  if (unauthorized !== undefined) return unauthorized
  const payload = await getPayload({ config })
  const settings = await payload.findGlobal({ slug: 'settings', depth: 0, overrideAccess: true })
  return handleInboundEmailRequest(request, {
    secret: env.INTERNAL_SECRET,
    sink: createInboundMailSink(payload, inboundOptions(settings, env)),
  })
}
