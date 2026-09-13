import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { assertIsolated, baseConfig, loadTenants, renderWranglerConfig, tenantEnv } from '../../gen-wrangler'
import { parseJsonc } from '../../lib/jsonc'
import { parseTenant, type Tenant } from '../../lib/tenant-schema'

const ROOT = fileURLToPath(new URL('../../..', import.meta.url))

function tenant(slug: string, deployOrder: number): Tenant {
  return {
    slug,
    displayName: `Tenant ${slug}`,
    hostType: 'platform',
    host: `${slug}.platform.example.test`,
    template: 'agency',
    timezone: 'UTC',
    locale: 'en',
    currency: 'USD',
    owner: { email: 'owner@example.test', name: 'Owner' },
    email: { fromName: 'Tenant', fromAddress: 'no-reply@example.test', inboundDomain: 'in.example.test' },
    d1: { name: `ops-${slug}` },
    r2: { bucket: `ops-${slug}` },
    rateLimitNamespaces: { intake: String(1001 + deployOrder * 10), auth: String(1002 + deployOrder * 10) },
    intake: { allowedOrigins: ['https://www.example.test'], turnstileHostnames: ['www.example.test'] },
    deployOrder,
  }
}

describe('parseJsonc', () => {
  it('removes comments but keeps comment markers inside strings', () => {
    const text = '// header\n{ "url": "https://example.test/*x*/", /* inline */ "n": 1 }'
    expect(parseJsonc(text)).toEqual({ url: 'https://example.test/*x*/', n: 1 })
  })

  it('accepts trailing commas but keeps commas inside strings', () => {
    const text = '{ "list": [1, 2,], "note": "a,}", // end\n}'
    expect(parseJsonc(text)).toEqual({ list: [1, 2], note: 'a,}' })
  })
})

describe('parseTenant', () => {
  it('requires a host unless the tenant is on workers.dev', () => {
    const withoutHost = Object.fromEntries(Object.entries(tenant('alpha', 0)).filter(([key]) => key !== 'host'))
    expect(() => parseTenant(withoutHost, 'alpha.jsonc')).toThrow(/host is required/)
    expect(parseTenant({ ...withoutHost, hostType: 'workers_dev' }, 'alpha.jsonc').slug).toBe('alpha')
  })
})

describe('gen-wrangler', () => {
  it('loads the repository tenants in deploy order', () => {
    expect(loadTenants(ROOT).map((entry) => entry.slug)).toEqual(['mirchmedia'])
  })

  it('gives each tenant environment only its own resources', () => {
    const env = tenantEnv(tenant('alpha', 0))
    expect(env).toMatchObject({
      name: 'ops-alpha',
      routes: [{ pattern: 'alpha.platform.example.test', custom_domain: true }],
      d1_databases: [{ binding: 'D1', database_name: 'ops-alpha', remote: true }],
      r2_buckets: [{ binding: 'R2', bucket_name: 'ops-alpha', remote: true }],
      services: [{ binding: 'WORKER_SELF_REFERENCE', service: 'ops-alpha' }],
      vars: { TENANT_SLUG: 'alpha', APP_ORIGIN: 'https://alpha.platform.example.test' },
      triggers: { crons: ['*/15 * * * *'] },
    })
  })

  it('keeps the top level free of tenant resources', () => {
    const rendered = renderWranglerConfig([tenant('alpha', 0), tenant('beta', 1)])
    const config = parseJsonc(rendered) as Record<string, unknown>
    const { env, ...top } = config
    expect(top).toEqual(baseConfig())
    expect(JSON.stringify(top)).not.toMatch(/alpha|beta|"remote"/)
    expect(Object.keys(env as object)).toEqual(['alpha', 'beta'])
  })

  it('rejects tenants that share a bucket or namespace', () => {
    const shared = { ...tenant('beta', 1), r2: { bucket: 'ops-alpha' } }
    expect(() => {
      assertIsolated([tenant('alpha', 0), shared])
    }).toThrow(/r2:ops-alpha/)
  })
})
