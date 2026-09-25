import { parseArgs } from 'node:util'
import { isMain, runCli } from './lib/report'
import { dryRunRunner, shellRunner } from './lib/provision/commands'
import { deployTenants } from './lib/deploy/loop'
import { loadTenants } from './gen-wrangler'
import { smokeTenant, tenantUrl } from './smoke-tenant'

/** Runs the safe deployment drill or the explicitly authorized tagged deployment. */
export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      tag: { type: 'string' },
      execute: { type: 'boolean', default: false },
      'fail-smoke': { type: 'boolean', default: false },
    },
  })
  const tag = values.tag ?? 'dry-run'
  const execute = values.execute
  if (execute && process.env['OPS_ALLOW_LIVE'] !== '1') {
    throw new Error('live deployment is disabled; set OPS_ALLOW_LIVE=1 only in the operator deployment environment')
  }
  const tenants = loadTenants(process.cwd())
  const runner = execute ? shellRunner(process.cwd()) : dryRunRunner(console.log)
  const results = await deployTenants(tenants, tag, {
    run: runner,
    smoke: async (tenant) => smokeTenant(tenant, smokeOptions(tenant, execute, values['fail-smoke'])),
  })
  const failed = results.find((result) => result.status === 'failed')
  console.log(`deploy: ${failed === undefined ? 'ok' : 'failed'} (${results.map(statusOf).join(', ')})`)
  return failed === undefined ? 0 : 1
}

function smokeOptions(
  tenant: ReturnType<typeof loadTenants>[number],
  execute: boolean,
  failSmoke: boolean,
): Parameters<typeof smokeTenant>[1] {
  const secret = process.env[`INTERNAL_SECRET_${tenant.slug.toUpperCase().replaceAll('-', '_')}`]
  const base = tenantUrl(tenant)
  return {
    ...(execute ? { fetch, mode: 'execute' as const } : {}),
    ...(execute && secret !== undefined
      ? {
          r2Probe: () => probe(`${base}/api/v1/internal/provision/r2-probe`, secret),
          emailProbe: () => probe(`${base}/api/v1/internal/provision/email-probe`, secret),
        }
      : {}),
    ...(failSmoke ? { failCheck: 'health' } : {}),
  }
}

async function probe(url: string, secret: string): Promise<boolean> {
  const controller = new AbortController()
  const timer = setTimeout(() => {
    controller.abort()
  }, 10_000)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'x-internal-secret': secret },
      signal: controller.signal,
    })
    return response.ok
  } finally {
    clearTimeout(timer)
  }
}

function statusOf(result: { readonly slug: string; readonly status: string }): string {
  return `${result.slug}:${result.status}`
}

if (isMain(import.meta.url)) runCli(main)
