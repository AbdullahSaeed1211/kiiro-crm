import { z } from 'zod'

const namespaceId = z.string().regex(/^[1-9]\d*$/)
const text = z.string().min(1)
const cloudflareName = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,62}$/)
const hostname = z
  .string()
  .regex(/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i)

/** Schema of `tenants/<slug>.jsonc` (spec §19.1); `workers_dev` hosts are spike-only (E-003). */
export const tenantSchema = z
  .object({
    slug: z.string().regex(/^[a-z][a-z0-9-]{1,39}$/),
    displayName: text,
    hostType: z.enum(['platform', 'custom', 'workers_dev']),
    host: hostname.optional(),
    template: text,
    timezone: text,
    locale: z.enum(['en', 'es']),
    currency: z.string().regex(/^[A-Z]{3}$/),
    owner: z.object({ email: z.email(), name: text }),
    email: z.object({
      enabled: z.boolean().default(true),
      fromName: text,
      fromAddress: z.email(),
      inboundDomain: hostname,
      inboundLocalPrefix: text.optional(),
    }),
    brandAssets: z
      .union([z.object({ logoUrl: z.url(), faviconUrl: z.url() }), z.object({ logoPath: text, faviconPath: text })])
      .optional(),
    d1: z.object({ name: cloudflareName, id: z.uuid().optional() }),
    r2: z.object({ bucket: cloudflareName }),
    rateLimitNamespaces: z.object({ intake: namespaceId, auth: namespaceId }),
    intake: z.object({ allowedOrigins: z.array(z.url()), turnstileHostnames: z.array(text) }),
    deployOrder: z.number().int().min(0),
  })
  .superRefine((tenant, context) => {
    if (tenant.hostType !== 'workers_dev' && tenant.host === undefined) {
      context.addIssue({ code: 'custom', message: 'host is required unless hostType is workers_dev', path: ['host'] })
    }
    if (tenant.email.inboundLocalPrefix !== undefined && !tenant.email.inboundLocalPrefix.endsWith('--')) {
      context.addIssue({
        code: 'custom',
        message: 'inboundLocalPrefix must end with --',
        path: ['email', 'inboundLocalPrefix'],
      })
    }
  })

/** A validated tenant definition. */
export type Tenant = z.infer<typeof tenantSchema>

/** Returns whether a tenant needs a service binding in the shared platform mail router. */
export function isPlatformHosted(tenant: Tenant): boolean {
  return tenant.hostType === 'platform'
}

/** Validates a parsed tenant file; throws with `source` and every issue when invalid. */
export function parseTenant(value: unknown, source: string): Tenant {
  const result = tenantSchema.safeParse(value)
  if (result.success) return result.data
  throw new Error(`${source}: ${z.prettifyError(result.error)}`)
}
