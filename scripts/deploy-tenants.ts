import { parseArgs } from 'node:util'
import { isMain } from './lib/report'
import { runCli } from './harness/lib/repo'
import { dryRunRunner, shellRunner } from './lib/provision/commands'
import { deployTenants } from './lib/deploy/loop'
import { loadTenants } from './gen-wrangler'
import { smokeTenant } from './smoke-tenant'

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
    smoke: async (tenant) => smokeTenant(tenant, values['fail-smoke'] ? { failCheck: 'health' } : {}),
  })
  const failed = results.find((result) => result.status === 'failed')
  console.log(`deploy: ${failed === undefined ? 'ok' : 'failed'} (${results.map(statusOf).join(', ')})`)
  return failed === undefined ? 0 : 1
}

function statusOf(result: { readonly slug: string; readonly status: string }): string {
  return `${result.slug}:${result.status}`
}

if (isMain(import.meta.url)) runCli(main)
