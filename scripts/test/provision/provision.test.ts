import { describe, expect, it } from 'vitest'
import { parseBookmark, parseD1Id } from '../../lib/provision/commands'
import { createSecretPayload, manualChecklist, provisionPlan, provisionTenant } from '../../lib/provision/plan'
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
})

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
