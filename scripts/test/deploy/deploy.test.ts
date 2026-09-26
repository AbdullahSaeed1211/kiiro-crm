import { describe, expect, it } from 'vitest'
import { deployTenants, restorePointCommand, rollbackCommand } from '../../lib/deploy/loop'
import { OPENNEXT, shellRunner, WRANGLER } from '../../lib/provision/commands'
import type { Tenant } from '../../lib/tenant-schema'
import type { SmokeResult } from '../../smoke-tenant'

const makeTenant = (slug: string, deployOrder: number): Tenant => ({
  slug,
  displayName: slug,
  hostType: 'platform',
  host: `${slug}.example.test`,
  template: 'agency',
  timezone: 'UTC',
  locale: 'en',
  currency: 'USD',
  owner: { email: 'owner@example.test', name: 'Owner' },
  email: {
    enabled: true,
    fromName: slug,
    fromAddress: 'no-reply@example.test',
    inboundDomain: 'in.example.test',
    inboundLocalPrefix: `${slug}--`,
  },
  d1: { name: `ops-${slug}` },
  r2: { bucket: `ops-${slug}` },
  rateLimitNamespaces: { intake: String(100 + deployOrder * 2), auth: String(101 + deployOrder * 2) },
  intake: { allowedOrigins: [`https://${slug}.example.test`], turnstileHostnames: [`${slug}.example.test`] },
  deployOrder,
})

const okay: SmokeResult = { ok: true, checks: [], executed: true }
const failed: SmokeResult = {
  ok: false,
  checks: [{ name: 'health', ok: false, detail: 'injected failure', state: 'fail' }],
  executed: true,
}

describe('deployment loop', () => {
  it('uses restore points and code-only rollback commands', () => {
    const alpha = makeTenant('alpha', 0)
    expect(restorePointCommand(alpha)).toBe(`${WRANGLER} d1 time-travel info ops-alpha --env alpha`)
    expect(rollbackCommand(alpha, 'v1.2.3')).toBe(
      `${WRANGLER} rollback --name ops-alpha --message "v1.2.3 failed smoke" --yes`,
    )
  })
})

describe('deployment failure handling', () => {
  it('stops later tenants and rolls back the tenant with an injected smoke failure', async () => {
    const commands: string[] = []
    const alpha = makeTenant('alpha', 0)
    const beta = makeTenant('beta', 1)
    const results = await deployTenants([beta, alpha], 'v1.0.0', {
      run: (command) => {
        commands.push(command)
        return Promise.resolve({ exitCode: 0, output: 'bookmark: bookmark-alpha' })
      },
      smoke: (tenant) => Promise.resolve(tenant.slug === 'alpha' ? failed : okay),
    })
    expect(results.map((result) => [result.slug, result.status, result.rolledBack])).toEqual([
      ['alpha', 'failed', true],
      ['beta', 'blocked', false],
    ])
    expect(commands).toContain(`${WRANGLER} rollback --name ops-alpha --message "v1.0.0 failed smoke" --yes`)
    expect(commands.some((command) => command.includes('ops-beta'))).toBe(false)
  })
})

describe('deployment safety', () => {
  it('deploys all tenants in deploy order when smoke passes', async () => {
    const commands: string[] = []
    const results = await deployTenants([makeTenant('beta', 1), makeTenant('alpha', 0)], 'v1.0.0', {
      run: (command) => {
        commands.push(command)
        return Promise.resolve({ exitCode: 0, output: 'bookmark: stable' })
      },
      smoke: () => Promise.resolve(okay),
    })
    expect(results.every((result) => result.status === 'deployed')).toBe(true)
    expect(commands[0]).toContain('ops-alpha')
    expect(commands).not.toContain(expect.stringContaining('rollback'))
  })

  it('rejects release tags that could escape a shell argument', () => {
    expect(() => rollbackCommand(makeTenant('alpha', 0), 'v1.0.0";touch /tmp/pwned')).toThrow(/unsupported characters/)
  })

  it('resolves the pinned OpenNext executable from the web workspace', async () => {
    const result = await shellRunner(process.cwd())(`${OPENNEXT} --version`)
    expect(result.exitCode).toBe(0)
    expect(result.output).toContain('1.20.6')
  }, 30_000)

  it('includes APP_VERSION in the deploy command', async () => {
    const commands: string[] = []
    const tenant = makeTenant('alpha', 0)
    const tag = 'v1.2.3'
    await deployTenants([tenant], tag, {
      run: (command) => {
        commands.push(command)
        return Promise.resolve({ exitCode: 0, output: 'bookmark: stable' })
      },
      smoke: () => Promise.resolve(okay),
    })
    const deployCommand = commands.find((cmd) => cmd.includes(OPENNEXT))
    expect(deployCommand).toContain(`--var APP_VERSION:${tag}`)
  })
})
