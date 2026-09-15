import { existsSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { assertCommand, hasExactResourceName, WRANGLER } from './commands'
import type { ProvisionDependencies, ProvisionState } from './types'
import type { Tenant } from '../tenant-schema'

interface StepResult {
  readonly secretsFile: string | undefined
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
  return { secretsFile: undefined, secrets }
}

/** Synchronizes a platform tenant's internal secret to the shared mail router without exposing its value. */
export async function executeRouterSecrets(input: {
  readonly tenant: Tenant
  readonly deps: ProvisionDependencies
  readonly existingSecretsFile: string | undefined
  readonly secrets: Record<string, string> | undefined
}): Promise<StepResult> {
  const { tenant, deps, existingSecretsFile, secrets } = input
  const secret = secrets?.['INTERNAL_SECRET']
  const name = routerSecretName(tenant)
  if (secret === undefined) throw new Error(`${name} is required to sync ops-mail-router`)
  const payloadFile = tempSecretsFile(tenant, { [name]: secret })
  try {
    const command = `${WRANGLER} secret bulk ${payloadFile} --name ops-mail-router`
    const result = await deps.run(command)
    assertCommand(result, command)
    const list = `${WRANGLER} secret list --name ops-mail-router --format json`
    const listed = await deps.run(list)
    assertCommand(listed, list)
    if (!hasExactResourceName(listed.output, name)) throw new Error(`ops-mail-router is missing ${name}`)
    return { secretsFile: existingSecretsFile, ...(secrets === undefined ? {} : { secrets }) }
  } finally {
    if (existsSync(payloadFile)) rmSync(payloadFile, { force: true })
  }
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
  }
}

function internalEndpoint(tenant: Tenant, path: string): string {
  const host = tenant.hostType === 'workers_dev' ? `ops-${tenant.slug}.workers.dev` : (tenant.host ?? '')
  return `https://${host}/api/v1/internal/${path}`
}

function routerSecretName(tenant: Tenant): string {
  return `INTERNAL_SECRET_${tenant.slug.toUpperCase().replaceAll('-', '_')}`
}

function tempSecretsFile(tenant: Tenant, payload: Record<string, string>): string {
  const file = join(process.cwd(), `.tenant-secrets-router-${tenant.slug}-${String(process.pid)}.json`)
  writeFileSync(file, JSON.stringify(payload), { mode: 0o600 })
  return file
}
