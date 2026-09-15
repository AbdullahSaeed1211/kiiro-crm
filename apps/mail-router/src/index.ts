import { routePlatformInbound, type InboundEmailMessage, type MailRouterTarget } from '@ops/adapter-cloudflare'

interface MailRouterBindings extends Record<string, unknown> {
  readonly PLATFORM_DOMAIN: string
}

const bindingMap = <T>(env: MailRouterBindings, prefix: string, accepts: (value: unknown) => value is T) =>
  new Map(
    Object.entries(env).flatMap(([key, value]) =>
      key.startsWith(prefix) && accepts(value)
        ? [[key.slice(prefix.length).toLowerCase().replaceAll('_', '-'), value] as const]
        : [],
    ),
  )

const tenants = (env: MailRouterBindings): ReadonlyMap<string, MailRouterTarget> =>
  bindingMap(env, 'TENANT_', (value): value is MailRouterTarget => typeof value === 'object' && value !== null)

const secrets = (env: MailRouterBindings): ReadonlyMap<string, string> =>
  bindingMap(env, 'INTERNAL_SECRET_', (value): value is string => typeof value === 'string' && value !== '')

/** Shared platform-domain router; unknown tenants and missing tenant secrets fail closed. */
export default {
  email(message: InboundEmailMessage, env: MailRouterBindings): Promise<void> {
    return routePlatformInbound(
      {
        platformDomain: env.PLATFORM_DOMAIN,
        appOrigin: `https://${env.PLATFORM_DOMAIN}`,
        tenants: tenants(env),
        secrets: secrets(env),
      },
      message,
    )
  },
}
