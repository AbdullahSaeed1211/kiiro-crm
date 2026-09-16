import { describe, expect, it } from 'vitest'
import { commandSupportedByHelp, shellRunner, WRANGLER } from '../../lib/provision/commands'
import { provisionTenant } from '../../lib/provision/plan'
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
    enabled: true,
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

describe('installed CLI contracts', () => {
  it('checks the pinned Wrangler help instead of an authored help stub', async () => {
    const run = shellRunner(process.cwd())
    const help = async (command: string): Promise<string> => {
      const result = await run(`${WRANGLER} ${command} --help`)
      expect(result.exitCode).toBe(0)
      return result.output
    }
    expect(commandSupportedByHelp(`${WRANGLER} r2 bucket list`, await help('r2 bucket list'))).toBe(true)
    expect(commandSupportedByHelp(`${WRANGLER} secret list --format json`, await help('secret list'))).toBe(true)
    expect(
      commandSupportedByHelp(`${WRANGLER} email sending list in.example.test`, await help('email sending list')),
    ).toBe(true)
    expect(commandSupportedByHelp(`${WRANGLER} rollback --yes`, await help('rollback'))).toBe(true)
  }, 30_000)
})

describe('router secret synchronization', () => {
  it('uploads and verifies a platform router secret without logging its value', async () => {
    const commands: string[] = []
    await provisionTenant(tenant, {
      state: {
        d1: true,
        r2: true,
        wrangler: true,
        secrets: true,
        migration: true,
        deployment: true,
        seed: true,
        senderStatus: true,
        routerSecrets: false,
        smoke: true,
      },
      internalSecret: 'router-secret',
      run: (command) => {
        commands.push(command)
        const output = command.includes('secret list') ? '[{"name":"INTERNAL_SECRET_ALPHA"}]' : ''
        return Promise.resolve({ exitCode: 0, output })
      },
      print: () => undefined,
    })
    expect(commands.some((command) => command.includes('secret bulk'))).toBe(true)
    expect(commands.join(' ')).not.toContain('router-secret')
  })
})

// eslint-disable-next-line max-lines-per-function -- smoke cases keep the enabled and disabled capability contracts together.
describe('smoke runtime contracts', () => {
  it('accepts a tenant-configured disabled email capability without calling the probe', async () => {
    let emailProbeCalled = false
    const result = await smokeTenant(
      { ...tenant, email: { ...tenant.email, enabled: false } },
      {
        mode: 'execute',
        fetch: runtimeFetch,
        r2Probe: () => Promise.resolve(true),
        emailProbe: () => {
          emailProbeCalled = true
          return Promise.resolve(false)
        },
      },
    )
    expect(result.ok).toBe(true)
    expect(result.checks.find((check) => check.name === 'email')).toMatchObject({
      ok: true,
      state: 'pass',
      detail: 'disabled by tenant configuration',
    })
    expect(emailProbeCalled).toBe(false)
  })

  it('fails execute mode when authenticated R2 or email probes are missing', async () => {
    const result = await smokeTenant(tenant, { mode: 'execute', fetch: runtimeFetch })
    expect(result.ok).toBe(false)
    expect(result.checks.filter((check) => !check.ok).map((check) => check.name)).toEqual(['r2', 'email'])
  })

  it('marks dry-run checks distinctly from executed passes', async () => {
    const result = await smokeTenant(tenant, { print: () => undefined })
    expect(result.executed).toBe(false)
    expect(result.checks.every((check) => check.state === 'dry-run')).toBe(true)
  })

  it('validates health payloads and times out requests closed', async () => {
    const invalid = await smokeTenant(tenant, {
      mode: 'execute',
      fetch: (input) => Promise.resolve(responseFor(urlOf(input), false)),
      r2Probe: () => Promise.resolve(true),
      emailProbe: () => Promise.resolve(true),
    })
    expect(invalid.checks.find((check) => check.name === 'health')?.ok).toBe(false)

    const timedOut = await smokeTenant(tenant, {
      mode: 'execute',
      timeoutMs: 1,
      fetch: delayedResponse,
      r2Probe: () => Promise.resolve(true),
      emailProbe: () => Promise.resolve(true),
    })
    expect(timedOut.checks.find((check) => check.name === 'health')?.detail).toContain('timed out')
  })
})

function runtimeFetch(input: RequestInfo | URL): Promise<Response> {
  return Promise.resolve(responseFor(urlOf(input), true))
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

function responseFor(url: string, validHealth: boolean): Response {
  if (url.endsWith('/api/v1/health')) {
    const body = validHealth ? { status: 'ok', version: 'test', migration: null } : { status: 'ok' }
    return new Response(JSON.stringify(body), { status: 200 })
  }
  return new Response('<html></html>', { status: 200, headers: { 'content-type': 'text/html' } })
}

function delayedResponse(): Promise<Response> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(new Response())
    }, 100)
  })
}
