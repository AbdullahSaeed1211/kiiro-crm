import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseJsonc } from './lib/jsonc'
import { isMain, report } from './lib/report'
import { parseTenant, type Tenant } from './lib/tenant-schema'

interface IsolationMaps {
  d1Ids: Map<string, string>
  d1Names: Map<string, string>
  r2Buckets: Map<string, string>
  workerNames: Map<string, string>
  customDomains: Map<string, string>
  rateLimitNamespaces: Map<string, string>
}

interface CheckContext {
  findings: string[]
  line: string[]
  maps: IsolationMaps
  tenant: Tenant
}

interface IsolationResult {
  findings: string[]
  tenantLines: string[]
}

/** Reads and validates every `tenants/*.jsonc` below `root`. */
function loadTenants(root: string): Tenant[] {
  const dir = join(root, 'tenants')
  const files = readdirSync(dir).filter((file) => file.endsWith('.jsonc'))
  const tenants = files.map((file) => parseTenant(parseJsonc(readFileSync(join(dir, file), 'utf8')), `tenants/${file}`))
  return tenants.sort((a, b) => a.deployOrder - b.deployOrder)
}

/** Reads and parses the generated wrangler.jsonc. */
function loadWranglerConfig(root: string): Record<string, unknown> {
  const path = join(root, 'apps/web/wrangler.jsonc')
  const content = readFileSync(path, 'utf8')
  return parseJsonc(content)
}

/** Registers or reports a shared resource. */
function registerResource(
  resource: string,
  value: string,
  state: { map: Map<string, string>; slug: string; findings: string[] },
): void {
  const existing = state.map.get(value)
  if (existing) {
    state.findings.push(`${resource} ${value} shared by tenants ${existing} and ${state.slug}`)
  } else {
    state.map.set(value, state.slug)
  }
}

/** Checks tenant D1 and rate limit resources. */
function checkTenantResources(ctx: CheckContext): void {
  if (ctx.tenant.d1.id) {
    registerResource('D1 database_id', ctx.tenant.d1.id, {
      map: ctx.maps.d1Ids,
      slug: ctx.tenant.slug,
      findings: ctx.findings,
    })
    ctx.line.push(`d1_id=${ctx.tenant.d1.id}`)
  }

  registerResource('D1 database_name', ctx.tenant.d1.name, {
    map: ctx.maps.d1Names,
    slug: ctx.tenant.slug,
    findings: ctx.findings,
  })
  ctx.line.push(`d1_name=${ctx.tenant.d1.name}`)

  registerResource('R2 bucket', ctx.tenant.r2.bucket, {
    map: ctx.maps.r2Buckets,
    slug: ctx.tenant.slug,
    findings: ctx.findings,
  })
  ctx.line.push(`r2_bucket=${ctx.tenant.r2.bucket}`)

  const intake = ctx.tenant.rateLimitNamespaces.intake
  const intakeName = `Rate limit namespace ${intake} (intake)`
  registerResource(intakeName, intake, {
    map: ctx.maps.rateLimitNamespaces,
    slug: ctx.tenant.slug,
    findings: ctx.findings,
  })
  const auth = ctx.tenant.rateLimitNamespaces.auth
  const authName = `Rate limit namespace ${auth} (auth)`
  registerResource(authName, auth, { map: ctx.maps.rateLimitNamespaces, slug: ctx.tenant.slug, findings: ctx.findings })
  ctx.line.push(`ratelimit_intake=${intake}`)
  ctx.line.push(`ratelimit_auth=${auth}`)
}

/** Checks routes in wrangler environment. */
function checkRoutes(ctx: CheckContext, tenantEnv: Record<string, unknown>): void {
  const routes = tenantEnv.routes as { pattern?: string; custom_domain?: boolean }[] | undefined
  if (!routes || !Array.isArray(routes)) return

  for (const route of routes) {
    if (route.pattern) {
      registerResource('Custom domain', route.pattern, {
        map: ctx.maps.customDomains,
        slug: ctx.tenant.slug,
        findings: ctx.findings,
      })
      ctx.line.push(`domain=${route.pattern}`)
    }
  }
}

/** Checks worker and route resources from wrangler.jsonc. */
function checkWranglerResources(ctx: CheckContext, tenantEnv: Record<string, unknown> | undefined): void {
  if (!tenantEnv || typeof tenantEnv !== 'object') return

  const workerName = tenantEnv.name as string | undefined
  if (workerName) {
    registerResource('Worker name', workerName, {
      map: ctx.maps.workerNames,
      slug: ctx.tenant.slug,
      findings: ctx.findings,
    })
    ctx.line.push(`worker_name=${workerName}`)
  }

  checkRoutes(ctx, tenantEnv)
}

/** Validates wrangler config and returns env block. */
function getEnvBlock(config: Record<string, unknown>, result: IsolationResult): Record<string, unknown> | null {
  const env = config.env as Record<string, unknown> | undefined
  if (!env || typeof env !== 'object') {
    result.findings.push('wrangler.jsonc missing or invalid env block')
    return null
  }
  return env
}

/** Processes each tenant for isolation checks. */
function processTenants(tenants: Tenant[], env: Record<string, unknown>, result: IsolationResult): void {
  const maps: IsolationMaps = {
    d1Ids: new Map(),
    d1Names: new Map(),
    r2Buckets: new Map(),
    workerNames: new Map(),
    customDomains: new Map(),
    rateLimitNamespaces: new Map(),
  }

  for (const tenant of tenants) {
    const line: string[] = [`tenant ${tenant.slug}:`]
    const ctx: CheckContext = { findings: result.findings, line, maps, tenant }
    checkTenantResources(ctx)
    const tenantEnv = env[tenant.slug] as Record<string, unknown> | undefined
    checkWranglerResources(ctx, tenantEnv)
    result.tenantLines.push(line.join(' '))
  }
}

/** Loads configuration with error reporting. */
function loadConfiguration(
  root: string,
  result: IsolationResult,
): { tenants: Tenant[]; env: Record<string, unknown> } | null {
  let tenants: Tenant[] = []
  try {
    tenants = loadTenants(root)
  } catch (error) {
    result.findings.push(error instanceof Error ? error.message : String(error))
    return null
  }

  if (tenants.length === 0) {
    result.findings.push('no tenants found')
    return null
  }

  let wranglerConfig: Record<string, unknown>
  try {
    wranglerConfig = loadWranglerConfig(root)
  } catch (error) {
    result.findings.push(error instanceof Error ? error.message : String(error))
    return null
  }

  const env = getEnvBlock(wranglerConfig, result)
  return env ? { tenants, env } : null
}

/** Checks tenant and wrangler.jsonc for isolation violations. */
function checkIsolation(root: string): IsolationResult {
  const result: IsolationResult = { findings: [], tenantLines: [] }
  const config = loadConfiguration(root, result)
  if (config) {
    processTenants(config.tenants, config.env, result)
  }
  return result
}

if (isMain(import.meta.url)) {
  const result = checkIsolation(process.cwd())
  for (const line of result.tenantLines) {
    console.log(line)
  }
  report('check:isolation', result.findings)
}
