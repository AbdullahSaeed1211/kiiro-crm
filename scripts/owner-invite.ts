import { isMain, runCli } from './lib/report'
import { fetchProvisionClient } from './lib/provision/http'
import { internalEndpoint, inviteUrlOf } from './lib/provision/execution'
import { loadTenant } from './lib/provision/plan'
import { tenantEnvKey } from './lib/tenant-schema'

/**
 * Prints a fresh owner invitation link for a tenant whose owner has not signed up yet, for when the link printed during
 * provisioning was lost. Refuses when the owner already has an account.
 */
export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  const slug = argv[0]
  if (slug === undefined) throw new Error('usage: OPS_ALLOW_LIVE=1 pnpm tenant:owner-invite <slug>')
  if (process.env['OPS_ALLOW_LIVE'] !== '1')
    throw new Error('this calls the live tenant; set OPS_ALLOW_LIVE=1 only in the operator environment')
  const tenant = loadTenant(process.cwd(), slug)
  const key = tenantEnvKey('INTERNAL_SECRET', slug)
  const secret = process.env[key]
  if (secret === undefined) throw new Error(`${key} is not set`)
  const response = await fetchProvisionClient().post(
    internalEndpoint(tenant, 'provision/owner-invite'),
    { email: tenant.owner.email },
    secret,
  )
  const url = inviteUrlOf(response.body)
  if (!response.ok || url === undefined)
    throw new Error(`no invitation was made (HTTP ${String(response.status)}); the owner may already have an account`)
  console.log(`owner invitation for ${tenant.owner.email} (shown once): ${url}`)
  return 0
}

if (isMain(import.meta.url)) runCli(main)
