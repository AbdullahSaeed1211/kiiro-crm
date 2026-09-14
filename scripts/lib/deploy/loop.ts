import { assertCommand, assertSafeToken, parseBookmark, WRANGLER, type CommandRunner } from '../provision/commands'
import { smokeTenant, type SmokeResult } from '../../smoke-tenant'
import type { Tenant } from '../tenant-schema'

/** A tenant's result in one deployment run. */
export interface DeploymentResult {
  readonly slug: string
  readonly status: 'deployed' | 'failed' | 'blocked'
  readonly bookmark?: string
  readonly error?: string
  readonly rolledBack: boolean
  readonly smoke?: SmokeResult
}

/** Dependencies for a deterministic, mockable deployment loop. */
export interface DeploymentDependencies {
  readonly run: CommandRunner
  readonly smoke?: (tenant: Tenant) => Promise<SmokeResult>
  readonly print?: (line: string) => void
}

/** The restore point command for a tenant. */
export function restorePointCommand(tenant: Tenant): string {
  return `${WRANGLER} d1 time-travel info ${tenant.d1.name} --env ${tenant.slug}`
}

/** The code-only rollback command. It never restores D1 data. */
export function rollbackCommand(tenant: Tenant, tag: string): string {
  const safeTag = assertSafeToken(tag, 'release tag', /^v?[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/)
  return `${WRANGLER} rollback --name ops-${tenant.slug} --message "${safeTag} failed smoke"`
}

/** Runs restore point, migration, deployment and smoke in deploy order, stopping and rolling back on failure. */
export async function deployTenants(
  tenants: readonly Tenant[],
  tag: string,
  deps: DeploymentDependencies,
): Promise<DeploymentResult[]> {
  const print = deps.print ?? console.log
  const results: DeploymentResult[] = []
  const ordered = [...tenants].sort((left, right) => left.deployOrder - right.deployOrder)
  let stopped = false
  for (const tenant of ordered) {
    if (stopped) {
      results.push(blockedResult(tenant, print))
      continue
    }
    const result = await deployOne(tenant, tag, deps)
    results.push(result)
    stopped = result.status === 'failed'
    printResult(result, print)
  }
  return results
}

async function deployOne(tenant: Tenant, tag: string, deps: DeploymentDependencies): Promise<DeploymentResult> {
  const restore = await deps.run(restorePointCommand(tenant))
  const bookmark = parseBookmark(restore.output)
  if (restore.exitCode !== 0 || bookmark === undefined) {
    const error = restore.exitCode === 0 ? 'restore point output did not include a bookmark' : restore.output.trim()
    return { slug: tenant.slug, status: 'failed', error, rolledBack: false }
  }
  try {
    await runMigrationAndDeploy(tenant, deps.run)
    const smoke = await (deps.smoke ?? ((current) => smokeTenant(current, {})))(tenant)
    if (!smoke.ok) throw new Error('smoke failed')
    return { slug: tenant.slug, status: 'deployed', bookmark, rolledBack: false, smoke }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const rollbackResult = await deps.run(rollbackCommand(tenant, tag))
    return { slug: tenant.slug, status: 'failed', bookmark, error: message, rolledBack: rollbackResult.exitCode === 0 }
  }
}

async function runMigrationAndDeploy(tenant: Tenant, run: CommandRunner): Promise<void> {
  const migrate = `CLOUDFLARE_ENV=${tenant.slug} pnpm --filter web exec payload migrate`
  assertCommand(await run(migrate, { CLOUDFLARE_ENV: tenant.slug }), migrate)
  const deploy = `opennextjs-cloudflare deploy --env=${tenant.slug}`
  assertCommand(await run(deploy), deploy)
}

function blockedResult(tenant: Tenant, print: (line: string) => void): DeploymentResult {
  print(`BLOCK ${tenant.slug}: a previous tenant failed`)
  return { slug: tenant.slug, status: 'blocked', rolledBack: false }
}

function printResult(result: DeploymentResult, print: (line: string) => void): void {
  if (result.status === 'deployed') print(`PASS ${result.slug}: deployed and smoke checks passed`)
  else if (result.status === 'failed')
    print(`${result.rolledBack ? 'ROLLBACK' : 'FAIL'} ${result.slug}: ${result.error ?? 'deployment failed'}`)
}
