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
  readonly state: 'pass' | 'dry-run' | 'fail'
}

/** Smoke result consumed by the deployment loop. */
export interface SmokeResult {
  readonly ok: boolean
  readonly checks: readonly SmokeCheckResult[]
  readonly executed: boolean
}

/** Injectable network and probe dependencies for local tests. */
export interface SmokeDependencies {
  readonly fetch?: typeof fetch
  readonly mode?: 'dry-run' | 'execute'
  readonly r2Probe?: () => Promise<boolean>
  readonly emailProbe?: () => Promise<boolean>
  readonly timeoutMs?: number
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
    httpCheck({ name: 'health', url: `${base}/api/v1/health`, deps, validate: validateHealth }),
    httpCheck({ name: 'login', url: `${base}/login`, deps, validate: validateLogin }),
    probeCheck({
      name: 'r2',
      forcedFailure: deps.failCheck === 'r2',
      probe: deps.r2Probe,
      dryRunDetail: 'put/get/delete probe (dry run)',
      successDetail: 'put/get/delete passed',
      mode: deps.mode ?? 'dry-run',
    }),
    probeCheck({
      name: 'email',
      forcedFailure: deps.failCheck === 'email',
      probe: deps.emailProbe,
      dryRunDetail: `test email to ${tenant.owner.email} (dry run)`,
      successDetail: 'accepted',
      mode: deps.mode ?? 'dry-run',
    }),
  ])
  for (const check of checks) {
    let prefix = 'FAIL'
    if (check.state === 'dry-run') prefix = 'DRY RUN'
    else if (check.ok) prefix = 'PASS'
    print(`${prefix} smoke ${check.name}: ${check.detail}`)
  }
  return { ok: checks.every((check) => check.ok), checks, executed: deps.mode === 'execute' }
}

async function httpCheck(input: {
  readonly name: string
  readonly url: string
  readonly deps: SmokeDependencies
  readonly validate: (response: Response) => boolean | Promise<boolean>
}): Promise<SmokeCheckResult> {
  const { name, url, deps, validate } = input
  if (deps.failCheck === name) return { name, ok: false, detail: 'injected failure', state: 'fail' }
  if (deps.fetch === undefined) return { name, ok: true, detail: `GET ${url} (dry run)`, state: 'dry-run' }
  try {
    const response = await requestWithTimeout({ request: deps.fetch, url, timeoutMs: deps.timeoutMs ?? 10_000 })
    const ok = await validResponse(response, validate)
    const detail = ok ? `HTTP ${String(response.status)}` : `invalid ${name} response`
    return {
      name,
      ok,
      detail,
      state: ok ? 'pass' : 'fail',
    }
  } catch (error) {
    return { name, ok: false, detail: error instanceof Error ? error.message : 'request failed', state: 'fail' }
  }
}

async function validResponse(
  response: Response,
  validate: (response: Response) => boolean | Promise<boolean>,
): Promise<boolean> {
  if (!response.ok) return false
  return validate(response)
}

async function probeCheck(input: {
  readonly name: string
  readonly forcedFailure: boolean
  readonly probe?: () => Promise<boolean>
  readonly dryRunDetail: string
  readonly successDetail: string
  readonly mode: 'dry-run' | 'execute'
}): Promise<SmokeCheckResult> {
  if (input.forcedFailure) return { name: input.name, ok: false, detail: 'injected failure', state: 'fail' }
  if (input.mode === 'execute' && input.probe === undefined)
    return { name: input.name, ok: false, detail: 'incomplete authenticated probe', state: 'fail' }
  if (input.probe === undefined) return { name: input.name, ok: true, detail: input.dryRunDetail, state: 'dry-run' }
  return runProbe(input)
}

async function runProbe(input: {
  readonly name: string
  readonly probe: () => Promise<boolean>
  readonly successDetail: string
}): Promise<SmokeCheckResult> {
  try {
    const ok = await input.probe()
    return { name: input.name, ok, detail: ok ? input.successDetail : 'probe failed', state: ok ? 'pass' : 'fail' }
  } catch (error) {
    return {
      name: input.name,
      ok: false,
      detail: error instanceof Error ? error.message : 'probe failed',
      state: 'fail',
    }
  }
}

async function validateHealth(response: Response): Promise<boolean> {
  try {
    const body: unknown = await response.json()
    if (typeof body !== 'object' || body === null) return false
    const value = body as Record<string, unknown>
    return (
      value['status'] === 'ok' &&
      typeof value['version'] === 'string' &&
      value['version'] !== '' &&
      (typeof value['migration'] === 'string' || value['migration'] === null)
    )
  } catch {
    return false
  }
}

function validateLogin(response: Response): boolean {
  return response.status === 200 && (response.headers.get('content-type') ?? '').toLowerCase().includes('text/html')
}

async function requestWithTimeout(input: {
  readonly request: typeof fetch
  readonly url: string
  readonly init?: RequestInit
  readonly timeoutMs: number
}): Promise<Response> {
  const { request, url, init, timeoutMs } = input
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort()
      reject(new Error(`request timed out after ${String(timeoutMs)}ms`))
    }, timeoutMs)
  })
  try {
    return await Promise.race([request(url, { ...init, signal: controller.signal }), timeout])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
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
  return runSmokeCli({
    slug,
    tenant,
    execute,
    ...(values['fail-check'] === undefined ? {} : { failCheck: values['fail-check'] }),
  })
}

async function runSmokeCli(input: {
  readonly slug: string
  readonly tenant: Tenant
  readonly execute: boolean
  readonly failCheck?: string
}): Promise<number> {
  const probes = input.execute
    ? authenticatedProbes(input.tenant, process.env[`INTERNAL_SECRET_${input.slug.toUpperCase().replaceAll('-', '_')}`])
    : {}
  const result = await smokeTenant(input.tenant, {
    ...(input.execute ? { fetch } : {}),
    ...(input.execute ? { mode: 'execute' as const } : {}),
    ...probes,
    ...(input.failCheck === undefined ? {} : { failCheck: input.failCheck }),
  })
  const status = result.ok ? 'ok' : 'failed'
  console.log(`smoke: ${input.slug} ${status}`)
  return result.ok ? 0 : 1
}

function authenticatedProbes(
  tenant: Tenant,
  secret: string | undefined,
): { r2Probe?: () => Promise<boolean>; emailProbe?: () => Promise<boolean> } {
  if (secret === undefined || secret === '') return {}
  const base = tenantUrl(tenant)
  return {
    r2Probe: () => internalProbe(`${base}/api/v1/internal/provision/r2-probe`, secret, 10_000),
    emailProbe: () => internalProbe(`${base}/api/v1/internal/provision/email-probe`, secret, 10_000),
  }
}

async function internalProbe(url: string, secret: string, timeoutMs: number): Promise<boolean> {
  const response = await requestWithTimeout({
    request: fetch,
    url,
    init: { method: 'POST', headers: { 'x-internal-secret': secret } },
    timeoutMs,
  })
  return response.ok
}

function assertLiveAllowed(execute: boolean): void {
  if (execute && process.env['OPS_ALLOW_LIVE'] !== '1') {
    throw new Error('live smoke checks are disabled; set OPS_ALLOW_LIVE=1 only in the operator deployment environment')
  }
}

if (isMain(import.meta.url)) runCli(main)
