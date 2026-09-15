import { describe, expect, it } from 'vitest'
import { provisionTenant } from '../../lib/provision/plan'
import type { Tenant } from '../../lib/tenant-schema'

const tenant: Tenant = {
  slug: 'alpha',
  displayName: 'Alpha',
  hostType: 'platform',
  host: 'alpha.example.test',
  template: 'agency',
  timezone: 'UTC',
  locale: 'en',
  currency: 'USD',
  owner: { email: 'owner@example.test', name: 'Owner' },
  email: {
    fromName: 'Alpha',
    fromAddress: 'no-reply@example.test',
    inboundDomain: 'in.example.test',
    inboundLocalPrefix: 'alpha--',
  },
  d1: { name: 'ops-alpha' },
  r2: { bucket: 'ops-alpha' },
  rateLimitNamespaces: { intake: '101', auth: '102' },
  intake: { allowedOrigins: ['https://alpha.example.test'], turnstileHostnames: ['alpha.example.test'] },
  deployOrder: 0,
}

describe('provision migration environment', () => {
  it('enables remote Cloudflare bindings for Payload migrations', async () => {
    const environments: Readonly<Record<string, string | undefined>>[] = []
    await provisionTenant(tenant, {
      state: {
        d1: true,
        r2: true,
        wrangler: true,
        secrets: true,
        deployment: true,
        seed: true,
        senderStatus: true,
        routerSecrets: true,
        smoke: true,
      },
      run: (command, environment) => {
        if (command.includes('payload migrate')) environments.push(environment ?? {})
        return Promise.resolve({ exitCode: 0, output: 'bookmark: ok' })
      },
    })
    expect(environments).toEqual([{ CLOUDFLARE_ENV: 'alpha', PAYLOAD_REMOTE_BINDINGS: '1' }])
  })
})
