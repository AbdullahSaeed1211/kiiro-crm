import { z } from 'zod'

const namespaceId = z.string().regex(/^[1-9]\d*$/)
const text = z.string().min(1)

/** Schema of `tenants/<slug>.jsonc` (spec §19.1); `workers_dev` hosts are spike-only (E-003). */
export const tenantSchema = z
  .object({
    slug: z.string().regex(/^[a-z][a-z0-9-]{1,39}$/),
    displayName: text,
    hostType: z.enum(['platform', 'custom', 'workers_dev']),
    host: text.optional(),
    template: text,
    timezone: text,
    locale: z.enum(['en', 'es']),
    currency: z.string().regex(/^[A-Z]{3}$/),
    owner: z.object({ email: z.email(), name: text }),
    email: z.object({
      fromName: text,
      fromAddress: z.email(),
      inboundDomain: text,
      inboundLocalPrefix: text.optional(),
    }),
    d1: z.object({ name: text, id: z.uuid().optional() }),
    r2: z.object({ bucket: z.string().min(3) }),
    rateLimitNamespaces: z.object({ intake: namespaceId, auth: namespaceId }),
    intake: z.object({ allowedOrigins: z.array(z.url()), turnstileHostnames: z.array(text) }),
    deployOrder: z.number().int().min(0),
  })
  .refine((tenant) => tenant.hostType === 'workers_dev' || tenant.host !== undefined, {
    message: 'host is required unless hostType is workers_dev',
    path: ['host'],
  })

/** A validated tenant definition. */
export type Tenant = z.infer<typeof tenantSchema>

/** Validates a parsed tenant file; throws with `source` and every issue when invalid. */
export function parseTenant(value: unknown, source: string): Tenant {
  const result = tenantSchema.safeParse(value)
  if (result.success) return result.data
  throw new Error(`${source}: ${z.prettifyError(result.error)}`)
}
