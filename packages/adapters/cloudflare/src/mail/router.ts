import type { InboundEmailMessage } from '../contracts/worker'

/** A tenant target used by the platform-domain mail router. */
export interface MailRouterTarget {
  fetch(request: Request): Promise<Response>
}

/** Router environment with tenant bindings indexed by slug. */
export interface MailRouterEnv {
  readonly platformDomain: string
  readonly tenants: ReadonlyMap<string, MailRouterTarget>
  readonly appOrigin: string
  readonly secrets: ReadonlyMap<string, string>
}

/** Routes `<slug>--<local>@in.<PLATFORM_DOMAIN>` to one tenant and rejects every ambiguous address. */
export async function routePlatformInbound(env: MailRouterEnv, message: InboundEmailMessage): Promise<void> {
  const [local, host] = message.to.trim().toLowerCase().split('@')
  if (host !== `in.${env.platformDomain}` || local === undefined) {
    message.setReject('Unknown recipient')
    return
  }
  const separator = local.indexOf('--')
  const slug = separator > 0 ? local.slice(0, separator) : ''
  const target = env.tenants.get(slug)
  const internalSecret = env.secrets.get(slug)
  if (target === undefined || internalSecret === undefined || local.slice(separator + 2) === '') {
    message.setReject('Unknown recipient')
    return
  }
  const body = await new Response(message.raw).arrayBuffer()
  const request = new Request(new URL('/api/v1/internal/email/inbound', env.appOrigin), {
    method: 'POST',
    body,
    headers: {
      'content-type': 'message/rfc822',
      'x-envelope-from': message.from,
      'x-envelope-to': message.to,
      'x-internal-secret': internalSecret,
    },
  })
  const response = await target.fetch(request)
  if (!response.ok) message.setReject('Unable to accept message')
}
