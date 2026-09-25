import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { assertCommand, hasExactResourceName, WRANGLER } from './commands'
import type { ProvisionDependencies, ProvisionState } from './types'
import { tenantEnvKey, type Tenant } from '../tenant-schema'

interface StepResult {
  readonly secrets?: Record<string, string>
}

/** Seeds the tenant through the authenticated internal HTTP boundary. */
export async function executeSeed(
  tenant: Tenant,
  deps: ProvisionDependencies,
  secrets: Record<string, string> | undefined,
): Promise<StepResult> {
  const secret = secrets?.['INTERNAL_SECRET']
  if (deps.http === undefined || secret === undefined)
    throw new Error('authenticated provisioning client and INTERNAL_SECRET are required for seeding')
  const response = await deps.http.post(internalEndpoint(tenant, 'provision'), seedBody(tenant), secret)
  if (!response.ok) throw new Error(`tenant seed failed (HTTP ${String(response.status)})`)
  return secrets === undefined ? {} : { secrets }
}

/** Synchronizes a platform tenant's internal secret to the shared mail router without exposing its value. */
export async function executeRouterSecrets(input: {
  readonly tenant: Tenant
  readonly deps: ProvisionDependencies
  readonly secretsDir: string
  readonly secrets: Record<string, string> | undefined
}): Promise<StepResult> {
  const { tenant, deps, secretsDir, secrets } = input
  const secret = secrets?.['INTERNAL_SECRET']
  const name = tenantEnvKey('INTERNAL_SECRET', tenant.slug)
  if (secret === undefined) throw new Error(`${name} is required to sync ops-mail-router`)
  const payloadFile = join(secretsDir, 'mail-router.json')
  writeFileSync(payloadFile, JSON.stringify({ [name]: secret }), { mode: 0o600 })
  try {
    await runChecked(deps, `${WRANGLER} secret bulk ${payloadFile} --name ops-mail-router`)
    const listed = await runChecked(deps, `${WRANGLER} secret list --name ops-mail-router --format json`)
    if (!hasExactResourceName(listed, name)) throw new Error(`ops-mail-router is missing ${name}`)
    return { secrets }
  } finally {
    if (existsSync(payloadFile)) rmSync(payloadFile, { force: true })
  }
}

/** Runs a command and returns its output, throwing when it fails. */
async function runChecked(deps: ProvisionDependencies, command: string): Promise<string> {
  const result = await deps.run(command)
  assertCommand(result, command)
  return result.output
}

/** Persists a completed remote operation through the authenticated provision boundary. */
export async function persistProvisionStatus(input: {
  readonly tenant: Tenant
  readonly deps: ProvisionDependencies
  readonly secrets: Record<string, string> | undefined
  readonly status: Partial<ProvisionState>
}): Promise<void> {
  const { tenant, deps, secrets, status } = input
  const secret = secrets?.['INTERNAL_SECRET']
  if (deps.http === undefined || secret === undefined) {
    throw new Error('authenticated provision status client and INTERNAL_SECRET are required to persist sender status')
  }
  const response = await deps.http.post(internalEndpoint(tenant, 'provision/status'), status, secret)
  if (!response.ok) throw new Error(`tenant provision status update failed (HTTP ${String(response.status)})`)
}

function seedBody(tenant: Tenant): Record<string, unknown> {
  return {
    displayName: tenant.displayName,
    template: tenant.template,
    owner: tenant.owner,
    timezone: tenant.timezone,
    locale: tenant.locale,
    currency: tenant.currency,
    intake: tenant.intake,
    ...(tenant.brandAssets === undefined ? {} : { brandAssets: seedBrandAssets(tenant.brandAssets) }),
  }
}

function seedBrandAssets(assets: NonNullable<Tenant['brandAssets']>): Record<string, string> {
  if ('logoUrl' in assets) return assets
  return {
    logoBase64: readAsset(assets.logoPath),
    logoContentType: contentTypeFor(assets.logoPath),
    faviconBase64: readAsset(assets.faviconPath),
    faviconContentType: contentTypeFor(assets.faviconPath),
  }
}

function readAsset(path: string): string {
  return readFileSync(resolve(process.cwd(), path)).toString('base64')
}

function contentTypeFor(path: string): string {
  const extension = path.toLowerCase().split('.').pop()
  if (extension === 'png') return 'image/png'
  if (extension === 'webp') return 'image/webp'
  if (extension === 'ico') return 'image/x-icon'
  throw new Error(`unsupported packaged brand asset extension: ${extension ?? 'unknown'}`)
}

function internalEndpoint(tenant: Tenant, path: string): string {
  const host = tenant.hostType === 'workers_dev' ? `ops-${tenant.slug}.workers.dev` : (tenant.host ?? '')
  return `https://${host}/api/v1/internal/${path}`
}
