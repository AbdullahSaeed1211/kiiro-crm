import { describe, expect, it } from 'vitest'
import { provisionTenant } from '../../lib/provision/plan'
import { WRANGLER } from '../../lib/provision/commands'
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
  it('enables remote Cloudflare bindings and forwards the generated Payload secret', async () => {
    const environments: Readonly<Record<string, string | undefined>>[] = []
    await provisionTenant(tenant, {
      state: {
        d1: true,
        r2: true,
        wrangler: true,
        secrets: false,
        deployment: true,
        seed: true,
        senderStatus: true,
        routerSecrets: true,
        smoke: true,
      },
      turnstileSecret: 'turnstile-secret',
      run: (command, environment) => {
        if (command.includes('payload migrate')) environments.push(environment ?? {})
        return Promise.resolve({ exitCode: 0, output: 'bookmark: ok' })
      },
    })
    expect(environments).toHaveLength(1)
    expect(environments[0]).toMatchObject({
      CLOUDFLARE_ENV: 'alpha',
      PAYLOAD_REMOTE_BINDINGS: '1',
    })
    expect(environments[0]?.['PAYLOAD_SECRET']).toEqual(expect.any(String))
  })
})

describe('new database binding', () => {
  it('regenerates Wrangler bindings immediately after creating D1', async () => {
    const commands: string[] = []
    await provisionTenant(tenant, {
      state: {
        d1: false,
        r2: true,
        wrangler: true,
        secrets: true,
        migration: true,
        deployment: true,
        seed: true,
        senderStatus: true,
        routerSecrets: true,
        smoke: true,
      },
      writeD1Id: () => undefined,
      run: (command) => {
        commands.push(command)
        return Promise.resolve({
          exitCode: 0,
          output: command.includes('d1 create') ? "database_id = '12345678-1234-4234-8234-123456789012'" : 'ok',
        })
      },
    })
    expect(commands).toEqual([`${WRANGLER} d1 create ops-alpha`, 'pnpm gen:wrangler'])
  })
})
