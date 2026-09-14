import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { commandSupportedByHelp, parseBookmark, parseD1Id, WRANGLER } from '../../lib/provision/commands'
import {
  createSecretPayload,
  discoverProvisionState,
  fetchProvisionClient,
  manualChecklist,
  provisionPlan,
  provisionStatusEndpoint,
  provisionTenant,
} from '../../lib/provision/plan'
import { smokeTenant } from '../../smoke-tenant'
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
      'print the manual domain, routing and Turnstile checklist',
      'run tenant smoke checks',
      'confirm Worker ops-alpha owns only its tenant bindings',
    ])
    const payload = createSecretPayload('turnstile-secret')
    expect(payload['TURNSTILE_SECRET']).toBe('turnstile-secret')
    expect(payload['PAYLOAD_SECRET']).not.toBe('turnstile-secret')
    expect(manualChecklist(tenant)).toContain('ops-mail-router')
  })

  it('keeps planned Wrangler commands aligned with captured 4.131.1 help', () => {
    const fixture = (name: string): string => readFileSync(join(import.meta.dirname, 'fixtures', name), 'utf8')
    expect(commandSupportedByHelp(`${WRANGLER} r2 bucket list`, fixture('r2-bucket-list-help.txt'))).toBe(true)
    expect(commandSupportedByHelp(`${WRANGLER} secret list --format json`, fixture('secret-list-help.txt'))).toBe(true)
    expect(
      commandSupportedByHelp(`${WRANGLER} email sending list in.example.test`, fixture('email-sending-list-help.txt')),
    ).toBe(true)
    expect(commandSupportedByHelp(`${WRANGLER} r2 bucket list --json`, fixture('r2-bucket-list-help.txt'))).toBe(false)
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
})

async function seedFixture(): Promise<{
  requests: { url: string; secret: string; body: unknown }[]
  commands: string[]
}> {
  const requests: { url: string; secret: string; body: unknown }[] = []
  const client = fetchProvisionClient((input, init) => {
    let requestUrl: string
    if (input instanceof Request) requestUrl = input.url
    else if (input instanceof URL) requestUrl = input.href
    else requestUrl = input
    const requestBody = typeof init?.body === 'string' ? init.body : '{}'
    requests.push({
      url: requestUrl,
      secret: new Headers(init?.headers).get('x-internal-secret') ?? '',
      body: JSON.parse(requestBody),
    })
    return Promise.resolve(new Response('{}', { status: 200 }))
  })
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
        smoke: true,
      },
      run: (command) => {
        commands.push(command)
        return Promise.resolve({ exitCode: 0, output: 'bookmark: ok' })
      },
      print: (line) => printed.push(line),
    })
    expect(commands).toEqual([])
    expect(completed).toHaveLength(12)
    expect(printed.filter((line) => line.startsWith('SKIP'))).toHaveLength(9)
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
    expect(commands).toEqual([`${WRANGLER} r2 bucket list`, `${WRANGLER} secret list --env alpha --format json`])
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

describe('smoke probe completeness', () => {
  it('fails execute-mode smoke when authenticated R2 or email probes are missing', async () => {
    const result = await smokeTenant(tenant, {
      mode: 'execute',
      fetch: () => Promise.resolve(new Response('ok', { status: 200 })),
    })
    expect(result.ok).toBe(false)
    expect(result.checks.filter((check) => !check.ok).map((check) => check.name)).toEqual(['r2', 'email'])
  })
})
