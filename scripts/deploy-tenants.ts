import { parseArgs } from 'node:util'
import { isMain, runCli } from './lib/report'
import { requestWithTimeout } from './lib/http'
import { tenantEnvKey } from './lib/tenant-schema'
import { dryRunRunner, shellRunner } from './lib/provision/commands'
import { deployTenants } from './lib/deploy/loop'
import { loadTenants } from './gen-wrangler'
import { smokeTenant, tenantUrl } from './smoke-tenant'

/** Checks that all tenants have their INTERNAL_SECRET set before deployment. */
function preflight(tenants: ReturnType<typeof loadTenants>, execute: boolean): void {
  if (!execute) return
  const missing = tenants.filter((tenant) => process.env[tenantEnvKey('INTERNAL_SECRET', tenant.slug)] === undefined)
  if (missing.length > 0) {
    throw new Error(`deployment aborted: missing INTERNAL_SECRET for tenants: ${missing.map((t) => t.slug).join(', ')}`)
  }
}

async function runDeploy(
  tag: string,
  execute: boolean,
  failSmoke: boolean,
): Promise<{ failed: boolean }> {
  const tenants = loadTenants(process.cwd())
  preflight(tenants, execute)
  const runner = execute ? shellRunner(process.cwd()) : dryRunRunner(console.log)
  const results = await deployTenants(tenants, tag, {
    run: runner,
    smoke: async (tenant) => smokeTenant(tenant, smokeOptions(tenant, execute, failSmoke)),
  })
  const failed = results.find((result) => result.status === 'failed')
  const message = failed === undefined ? 'ok' : 'failed'
  const statuses = results.map(statusOf).join(', ')
  console.log(`deploy: ${message} (${statuses})`)
  return { failed: failed !== undefined }
}

/** Runs the safe deployment drill or the explicitly authorized tagged deployment. */
export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  try {
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
    const result = await runDeploy(tag, execute, values['fail-smoke'])
    return result.failed ? 1 : 0
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`deploy failed: ${message}`)
    return 1
  }
}

function smokeOptions(
  tenant: ReturnType<typeof loadTenants>[number],
  execute: boolean,
  failSmoke: boolean,
): Parameters<typeof smokeTenant>[1] {
  const secret = process.env[tenantEnvKey('INTERNAL_SECRET', tenant.slug)]
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
  const init = { method: 'POST', headers: { 'x-internal-secret': secret } }
  return (await requestWithTimeout({ url, init, timeoutMs: 10_000 })).ok
}

function statusOf(result: { readonly slug: string; readonly status: string }): string {
  return `${result.slug}:${result.status}`
}

if (isMain(import.meta.url)) runCli(main)
