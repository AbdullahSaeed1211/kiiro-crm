import { describe, expect, it } from 'vitest'
import {
  exactJsonNames,
  hasExactResourceName,
  OPENNEXT,
  parseBookmark,
  parseD1Id,
  senderStatusReady,
  WRANGLER,
} from '../../lib/provision/commands'
import {
  createSecretPayload,
  discoverProvisionState,
  fetchProvisionClient,
  manualChecklist,
  provisionPlan,
  provisionStatusEndpoint,
  provisionTenant,
  senderDomain,
} from '../../lib/provision/plan'
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

describe('tenant operations helpers', () => {
  it('parses Wrangler database and bookmark output', () => {
    expect(parseD1Id("database_id = '12345678-1234-4234-8234-123456789012'")).toBe(
      '12345678-1234-4234-8234-123456789012',
    )
    expect(parseBookmark('latestBookmark: abc123')).toBe('abc123')
    expect(parseBookmark('{"bookmark":"json-bookmark"}')).toBe('json-bookmark')
    expect(hasExactResourceName('ops-alpha\n', 'ops-alpha')).toBe(true)
    expect(hasExactResourceName('ops-alpha\n', 'ops-al')).toBe(false)
    expect(hasExactResourceName('Error: ops-alpha\n', 'ops-alpha')).toBe(false)
    expect(exactJsonNames('[{"name":"INTERNAL_SECRET"}]')).toEqual(['INTERNAL_SECRET'])
    expect(senderStatusReady('[{"domain":"example.test","status":"verified"}]', 'example.test')).toBe(true)
    expect(senderStatusReady('[{"domain":"other.test","status":"verified"}]', 'example.test')).toBe(false)
    expect(senderDomain(tenant)).toBe('example.test')
  })
})

describe('provision plan contracts', () => {
  it('plans every required provisioning step and never prints secret values', () => {
    const plan = provisionPlan(tenant)
    expect(plan.map((step) => step.label)).toEqual([
      'validate tenant definition',
      'create D1 database when absent',
      'create R2 bucket when absent',
      'generate tenant Wrangler bindings',
      'upload tenant secrets',
      'apply backward-compatible Payload migrations',
      'deploy the existing build',
      'seed settings, template and owner invitation',
      'read Email Service sender status',
      'synchronize mail-router tenant secret',
      'print the manual domain, routing and Turnstile checklist',
      'run tenant smoke checks',
      'confirm Worker ops-alpha owns only its tenant bindings',
    ])
    const payload = createSecretPayload('turnstile-secret')
    expect(payload['TURNSTILE_SECRET']).toBe('turnstile-secret')
    expect(payload['PAYLOAD_SECRET']).not.toBe('turnstile-secret')
    expect(manualChecklist(tenant)).toContain('ops-mail-router')
    expect(plan.find((step) => step.key === 'deployment')?.command).toBe(`${OPENNEXT} deploy --env=alpha`)
    expect(plan.find((step) => step.key === 'senderStatus')?.command).toBe(
      `${WRANGLER} email sending list example.test`,
    )
  })
})

describe('authenticated seed client', () => {
  it('uses an authenticated HTTP seed client without putting the secret in a command', async () => {
    const { requests, commands } = await seedFixture()
    expect(requests[0]).toMatchObject({
      url: `https://${tenant.host ?? ''}/api/v1/internal/provision`,
      secret: 'in-memory-only',
    })
    expect(commands.join(' ')).not.toContain('in-memory-only')
  })

  it('bounds authenticated provisioning requests', async () => {
    const client = fetchProvisionClient(delayedResponse, 1)
    await expect(client.get('https://alpha.example.test/status', 'secret')).rejects.toThrow(/timed out/)
  })
})

async function seedFixture(): Promise<{
  requests: { url: string; secret: string; body: unknown }[]
  commands: string[]
}> {
  const requests: { url: string; secret: string; body: unknown }[] = []
  const client = fetchProvisionClient(recordRequest(requests))
  const commands: string[] = []
  await provisionTenant(tenant, {
    state: {
      d1: true,
      r2: true,
      wrangler: true,
      secrets: true,
      migration: true,
      deployment: true,
      seed: false,
      senderStatus: true,
      routerSecrets: true,
      smoke: true,
    },
    internalSecret: 'in-memory-only',
    http: client,
    run: (command) => {
      commands.push(command)
      return Promise.resolve({ exitCode: 0, output: '' })
    },
  })
  return { requests, commands }
}

function recordRequest(requests: { url: string; secret: string; body: unknown }[]): typeof fetch {
  return (input, init) => {
    const requestBody = typeof init?.body === 'string' ? init.body : '{}'
    requests.push({
      url: requestUrl(input),
      secret: new Headers(init?.headers).get('x-internal-secret') ?? '',
      body: JSON.parse(requestBody),
    })
    return Promise.resolve(new Response('{}', { status: 200 }))
  }
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

function delayedResponse(): Promise<Response> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(new Response())
    }, 100)
  })
}

describe('provision reruns', () => {
  it('skips completed steps on an idempotent rerun', async () => {
    const commands: string[] = []
    const printed: string[] = []
    const completed = await provisionTenant(tenant, {
      state: {
        d1: true,
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
      run: (command) => {
        commands.push(command)
        return Promise.resolve({ exitCode: 0, output: 'bookmark: ok' })
      },
      print: (line) => printed.push(line),
    })
    expect(commands).toEqual([])
    expect(completed).toHaveLength(13)
    expect(printed.filter((line) => line.startsWith('SKIP'))).toHaveLength(10)
  })
})

describe('provision discovery', () => {
  it('discovers safe resource and remote completion state through the CLI path', async () => {
    const { state, commands } = await discoveryFixture()
    expect(state).toMatchObject({
      d1: true,
      r2: true,
      secrets: true,
      migration: true,
      deployment: true,
      seed: true,
      senderStatus: true,
      smoke: true,
    })
    expect(commands).toEqual([
      `${WRANGLER} r2 bucket list`,
      `${WRANGLER} secret list --env alpha --format json`,
      `${WRANGLER} secret list --name ops-mail-router --format json`,
    ])
  })

  it('rejects unsafe tenant resource names before command construction', () => {
    expect(() => provisionPlan({ ...tenant, d1: { name: 'ops-alpha;touch' } })).toThrow(/unsupported characters/)
  })
})

async function discoveryFixture(): Promise<{
  state: Partial<
    Record<'d1' | 'r2' | 'secrets' | 'migration' | 'deployment' | 'seed' | 'senderStatus' | 'smoke', boolean>
  >
  commands: string[]
}> {
  const commands: string[] = []
  const existing = { ...tenant, d1: { name: 'ops-alpha', id: '12345678-1234-4234-8234-123456789012' } }
  const run = (command: string): Promise<{ exitCode: number; output: string }> => {
    commands.push(command)
    if (command.includes('r2 bucket list')) return Promise.resolve({ exitCode: 0, output: 'ops-alpha' })
    return Promise.resolve({
      exitCode: 0,
      output:
        '[{"name":"PAYLOAD_SECRET"},{"name":"INTERNAL_SECRET"},{"name":"TENANT_SECRET"},{"name":"TURNSTILE_SECRET"}]',
    })
  }
  const client = {
    get: (url: string, secret: string) =>
      Promise.resolve({
        ok: url === provisionStatusEndpoint(existing) && secret === 'status-secret',
        status: 200,
        body: { migration: true, deployment: true, seed: true, senderStatus: true, smoke: true },
      }),
    post: () => Promise.resolve({ ok: true, status: 200 }),
  }
  const state = await discoverProvisionState({
    tenant: existing,
    run,
    root: process.cwd(),
    status: { client, secret: 'status-secret' },
  })
  return { state, commands }
}
