import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { exactJsonNames, hasExactResourceName, resourceId, WRANGLER, type CommandRunner } from './commands'
import type { ProvisionHttpClient, ProvisionState } from './types'
import type { Tenant } from '../tenant-schema'
import { updateTenantD1Id } from './tenant-file'

/** Internal endpoint used to report completed provisioning operations without exposing secrets. */
export function provisionStatusEndpoint(tenant: Tenant): string {
  const host = tenant.hostType === 'workers_dev' ? `ops-${tenant.slug}.workers.dev` : (tenant.host ?? '')
  return `https://${host}/api/v1/internal/provision/status`
}

export { updateTenantD1Id }

/** Discovers remote and local completion state without mutating Cloudflare resources. */
export async function discoverProvisionState(input: {
  readonly tenant: Tenant
  readonly run: CommandRunner
  readonly root: string
  readonly status?: { readonly client: ProvisionHttpClient; readonly secret: string }
}): Promise<Partial<ProvisionState>> {
  const state: Partial<ProvisionState> = {
    d1: input.tenant.d1.id !== undefined,
    wrangler: existsSync(join(input.root, 'apps', 'web', 'wrangler.jsonc')),
  }
  await discoverResources(input, state)
  await discoverD1(input, state)
  await discoverRemoteStatus(input, state)
  return state
}

async function discoverResources(
  input: {
    readonly tenant: Tenant
    readonly run: CommandRunner
  },
  state: Partial<ProvisionState>,
): Promise<void> {
  const r2 = await input.run(`${WRANGLER} r2 bucket list`)
  state.r2 = r2.exitCode === 0 && hasExactResourceName(r2.output, input.tenant.r2.bucket)
  const secrets = await input.run(`${WRANGLER} secret list --env ${input.tenant.slug} --format json`)
  state.secrets = secrets.exitCode === 0 && secretNamesPresent(secrets.output)
  if (input.tenant.hostType === 'platform') {
    const router = await input.run(`${WRANGLER} secret list --name ops-mail-router --format json`)
    state.routerSecrets = router.exitCode === 0 && hasExactResourceName(router.output, routerSecretName(input.tenant))
  }
}

async function discoverD1(
  input: { readonly tenant: Tenant; readonly run: CommandRunner; readonly root: string },
  state: Partial<ProvisionState>,
): Promise<void> {
  if (input.tenant.d1.id !== undefined) return
  const databases = await input.run(`${WRANGLER} d1 list --json`)
  const id = databases.exitCode === 0 ? resourceId(databases.output, input.tenant.d1.name) : undefined
  if (id === undefined) return
  state.d1 = true
  updateTenantD1Id(input.root, input.tenant, id)
}

async function discoverRemoteStatus(
  input: {
    readonly tenant: Tenant
    readonly status?: { readonly client: ProvisionHttpClient; readonly secret: string }
  },
  state: Partial<ProvisionState>,
): Promise<void> {
  if (input.status === undefined) return
  try {
    const response = await input.status.client.get(provisionStatusEndpoint(input.tenant), input.status.secret)
    if (response.ok && response.body !== undefined) {
      const parsed = parseStatus(response.body)
      if (parsed !== undefined) Object.assign(state, parsed)
    }
  } catch {
    // Remote status is advisory during discovery; resource checks still fail closed.
  }
}

function secretNamesPresent(output: string): boolean {
  const names = exactJsonNames(output)
  return ['PAYLOAD_SECRET', 'INTERNAL_SECRET', 'TENANT_SECRET', 'TURNSTILE_SECRET'].every((name) =>
    names.includes(name),
  )
}

function routerSecretName(tenant: Tenant): string {
  return `INTERNAL_SECRET_${tenant.slug.toUpperCase().replaceAll('-', '_')}`
}

function parseStatus(value: unknown): Partial<ProvisionState> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const allowed = new Set<keyof ProvisionState>([
    'd1',
    'r2',
    'wrangler',
    'secrets',
    'migration',
    'deployment',
    'seed',
    'senderStatus',
    'routerSecrets',
    'smoke',
  ])
  const result: Partial<ProvisionState> = {}
  for (const [key, item] of Object.entries(value)) {
    if (!allowed.has(key as keyof ProvisionState) || typeof item !== 'boolean') return undefined
    result[key as keyof ProvisionState] = item
  }
  return result
}
