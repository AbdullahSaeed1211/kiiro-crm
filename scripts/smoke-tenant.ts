import { parseArgs } from 'node:util'
import { isMain } from './lib/report'
import { runCli } from './harness/lib/repo'
import { loadTenant, workerName } from './lib/provision/plan'
import type { Tenant } from './lib/tenant-schema'

/** One smoke check and its observed status. */
export interface SmokeCheckResult {
  readonly name: string
  readonly ok: boolean
  readonly detail: string
}

/** Smoke result consumed by the deployment loop. */
export interface SmokeResult {
  readonly ok: boolean
  readonly checks: readonly SmokeCheckResult[]
}

/** Injectable network and probe dependencies for local tests. */
export interface SmokeDependencies {
  readonly fetch?: typeof fetch
  readonly r2Probe?: () => Promise<boolean>
  readonly emailProbe?: () => Promise<boolean>
  readonly failCheck?: string
  readonly print?: (line: string) => void
}

/** Returns the tenant base URL used by smoke checks. */
export function tenantUrl(tenant: Tenant): string {
  return tenant.hostType === 'workers_dev'
    ? `https://${workerName(tenant)}.workers.dev`
    : `https://${tenant.host ?? ''}`
}

/** Runs health, login, R2 and email probes without exposing probe data in logs. */
export async function smokeTenant(tenant: Tenant, deps: SmokeDependencies): Promise<SmokeResult> {
  const print = deps.print ?? console.log
  const base = tenantUrl(tenant)
  const checks = await Promise.all([
    httpCheck('health', `${base}/api/v1/health`, deps),
    httpCheck('login', `${base}/login`, deps),
    probeCheck({
      name: 'r2',
      forcedFailure: deps.failCheck === 'r2',
      probe: deps.r2Probe,
      dryRunDetail: 'put/get/delete probe (dry run)',
      successDetail: 'put/get/delete passed',
    }),
    probeCheck({
      name: 'email',
      forcedFailure: deps.failCheck === 'email',
      probe: deps.emailProbe,
      dryRunDetail: `test email to ${tenant.owner.email} (dry run)`,
      successDetail: 'accepted',
    }),
  ])
  for (const check of checks) print(`${check.ok ? 'PASS' : 'FAIL'} smoke ${check.name}: ${check.detail}`)
  return { ok: checks.every((check) => check.ok), checks }
}

async function httpCheck(name: string, url: string, deps: SmokeDependencies): Promise<SmokeCheckResult> {
  if (deps.failCheck === name) return { name, ok: false, detail: 'injected failure' }
  if (deps.fetch === undefined) return { name, ok: true, detail: `GET ${url} (dry run)` }
  try {
    const response = await deps.fetch(url)
    return { name, ok: response.ok, detail: `HTTP ${String(response.status)}` }
  } catch {
    return { name, ok: false, detail: 'request failed' }
  }
}

async function probeCheck(input: {
  readonly name: string
  readonly forcedFailure: boolean
  readonly probe?: () => Promise<boolean>
  readonly dryRunDetail: string
  readonly successDetail: string
}): Promise<SmokeCheckResult> {
  if (input.forcedFailure) return { name: input.name, ok: false, detail: 'injected failure' }
  if (input.probe === undefined) return { name: input.name, ok: true, detail: input.dryRunDetail }
  const ok = await input.probe()
  return { name: input.name, ok, detail: ok ? input.successDetail : 'probe failed' }
}

/** Runs the safe smoke preview or the explicitly authorized remote probes. */
export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { execute: { type: 'boolean', default: false }, 'fail-check': { type: 'string' } },
  })
  const slug = positionals[0]
  if (slug === undefined) throw new Error('usage: pnpm tenant:smoke <slug> [--execute] [--fail-check <name>]')
  const tenant = loadTenant(process.cwd(), slug)
  const execute = values.execute
  assertLiveAllowed(execute)
  const result = await smokeTenant(tenant, {
    ...(execute ? { fetch } : {}),
    ...(values['fail-check'] === undefined ? {} : { failCheck: values['fail-check'] }),
  })
  const status = result.ok ? 'ok' : 'failed'
  console.log(`smoke: ${slug} ${status}`)
  return result.ok ? 0 : 1
}

function assertLiveAllowed(execute: boolean): void {
  if (execute && process.env['OPS_ALLOW_LIVE'] !== '1') {
    throw new Error('live smoke checks are disabled; set OPS_ALLOW_LIVE=1 only in the operator deployment environment')
  }
}

if (isMain(import.meta.url)) runCli(main)
