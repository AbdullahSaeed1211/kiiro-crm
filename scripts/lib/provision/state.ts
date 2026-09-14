import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { resourceId, WRANGLER, type CommandRunner } from './commands'
import type { ProvisionHttpClient, ProvisionState } from './plan'
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
  const r2 = await input.run(`${WRANGLER} r2 bucket list`)
  state.r2 = r2.exitCode === 0 && r2.output.includes(input.tenant.r2.bucket)
  const secrets = await input.run(`${WRANGLER} secret list --env ${input.tenant.slug} --format json`)
  state.secrets = secrets.exitCode === 0 && secretNamesPresent(secrets.output)
  await discoverD1(input, state)
  await discoverRemoteStatus(input, state)
  return state

  async function discoverD1(context: typeof input, target: Partial<ProvisionState>): Promise<void> {
    if (context.tenant.d1.id !== undefined) return
    const databases = await context.run(`${WRANGLER} d1 list --json`)
    const id = databases.exitCode === 0 ? resourceId(databases.output, context.tenant.d1.name) : undefined
    if (id === undefined) return
    target.d1 = true
    updateTenantD1Id(context.root, context.tenant, id)
  }

  async function discoverRemoteStatus(context: typeof input, target: Partial<ProvisionState>): Promise<void> {
    if (context.status === undefined) return
    const response = await context.status.client.get(provisionStatusEndpoint(context.tenant), context.status.secret)
    if (response.ok && response.body !== undefined) Object.assign(target, response.body)
  }
}

function secretNamesPresent(output: string): boolean {
  return ['PAYLOAD_SECRET', 'INTERNAL_SECRET', 'TENANT_SECRET', 'TURNSTILE_SECRET'].every((name) =>
    output.includes(name),
  )
}
