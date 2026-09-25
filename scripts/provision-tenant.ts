import { parseArgs } from 'node:util'
import { isMain, runCli } from './lib/report'
import { tenantEnvKey } from './lib/tenant-schema'
import { shellRunner } from './lib/provision/commands'
import {
  discoverProvisionState,
  fetchProvisionClient,
  loadTenant,
  manualChecklist,
  provisionPlan,
  provisionTenant,
} from './lib/provision/plan'

/** Runs the safe tenant provisioning preview or the explicitly authorized remote workflow. */
export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { 'dry-run': { type: 'boolean', default: false }, execute: { type: 'boolean', default: false } },
  })
  const slug = positionals[0]
  if (slug === undefined) throw new Error('usage: pnpm tenant:provision <slug> [--dry-run | --execute]')
  const root = process.cwd()
  const tenant = loadTenant(root, slug)
  const execute = values.execute
  assertLiveAllowed(execute)
  const dryRun = values['dry-run'] || !execute
  if (dryRun) {
    printDryRun(slug, tenant)
    return 0
  }
  await executeProvision(slug, root, tenant)
  console.log(`provision: ${slug} complete`)
  return 0
}

async function executeProvision(slug: string, root: string, tenant: ReturnType<typeof loadTenant>): Promise<void> {
  const turnstileSecret = process.env[tenantEnvKey('TURNSTILE_SECRET', slug)] ?? process.env['TURNSTILE_SECRET']
  const internalSecret = process.env[tenantEnvKey('INTERNAL_SECRET', slug)]
  const runner = shellRunner(root)
  const http = fetchProvisionClient()
  const status = internalSecret === undefined ? undefined : { client: http, secret: internalSecret }
  const state = await discoverProvisionState({ tenant, run: runner, root, ...(status === undefined ? {} : { status }) })
  if (state.secrets === true && internalSecret === undefined) {
    throw new Error(
      `${tenantEnvKey('INTERNAL_SECRET', slug)} is required to resume an existing tenant; retrieve it from secure operator custody before rerunning`,
    )
  }
  await provisionTenant(tenant, {
    run: runner,
    root,
    state,
    ...(turnstileSecret === undefined ? {} : { turnstileSecret }),
    ...(internalSecret === undefined ? {} : { internalSecret }),
    http,
  })
}

function assertLiveAllowed(execute: boolean): void {
  if (execute && process.env['OPS_ALLOW_LIVE'] !== '1') {
    throw new Error('live provisioning is disabled; set OPS_ALLOW_LIVE=1 only in the operator deployment environment')
  }
}

function printDryRun(slug: string, tenant: ReturnType<typeof loadTenant>): void {
  console.log(`provision: ${slug} dry run`)
  console.log('DRY RUN step: validate tenant definition')
  for (const step of provisionPlan(tenant)) {
    if (step.key === 'validate' && step.label === 'validate tenant definition') continue
    const command = step.command === undefined ? '' : ` -> ${step.command}`
    console.log(`DRY RUN step: ${step.label}${command}`)
  }
  console.log(manualChecklist(tenant))
}

if (isMain(import.meta.url)) runCli(main)
