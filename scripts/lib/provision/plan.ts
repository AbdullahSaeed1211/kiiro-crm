import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseJsonc } from '../jsonc'
import { assertCommand, assertSafeToken, parseD1Id, WRANGLER, type CommandRunner } from './commands'
import { parseTenant, type Tenant } from '../tenant-schema'
export { discoverProvisionState, provisionStatusEndpoint } from './state'
export { fetchProvisionClient } from './http'
import { updateTenantD1Id } from './tenant-file'
export { updateTenantD1Id } from './tenant-file'

/** The observable completion state for the eleven provisioning steps. */
export interface ProvisionState {
  d1: boolean
  r2: boolean
  wrangler: boolean
  secrets: boolean
  migration: boolean
  deployment: boolean
  seed: boolean
  senderStatus: boolean
  smoke: boolean
}

/** Commands needed to provision a tenant, in their required order. */
export interface ProvisionStep {
  readonly key: keyof ProvisionState | 'validate' | 'checklist'
  readonly label: string
  readonly command?: string
}

/** Dependencies for an executable or fully mocked provisioning run. */
export interface ProvisionDependencies {
  readonly run: CommandRunner
  readonly state?: Partial<ProvisionState>
  readonly check?: (step: keyof ProvisionState) => Promise<boolean>
  readonly root?: string
  readonly turnstileSecret?: string
  readonly writeD1Id?: (id: string) => void
  readonly print?: (line: string) => void
  readonly http?: ProvisionHttpClient
  readonly internalSecret?: string
}

/** Minimal HTTP boundary for authenticated internal tenant operations. */
export interface ProvisionHttpClient {
  post: (url: string, body: unknown, secret: string) => Promise<{ ok: boolean; status: number }>
  get: (url: string, secret: string) => Promise<{ ok: boolean; status: number; body?: Partial<ProvisionState> }>
}

interface StepContext {
  readonly tenant: Tenant
  readonly deps: ProvisionDependencies
  readonly state: Partial<ProvisionState>
  readonly secretsFile?: string
  readonly secrets?: Record<string, string>
}

/** Returns the tenant's stable Worker name. */
export function workerName(tenant: Tenant): string {
  return `ops-${tenant.slug}`
}

/** Returns the internal provisioning endpoint used for idempotent settings, template and invitation seeding. */
export function seedEndpoint(tenant: Tenant): string {
  if (tenant.hostType === 'workers_dev') return `https://${workerName(tenant)}.workers.dev/api/v1/internal/provision`
  return `https://${tenant.host ?? ''}/api/v1/internal/provision`
}

/** Creates the secret payload required by the tenant Worker. */
export function createSecretPayload(turnstileSecret: string): Record<string, string> {
  const secret = (): string => randomBytes(32).toString('base64url')
  return {
    PAYLOAD_SECRET: secret(),
    INTERNAL_SECRET: secret(),
    TENANT_SECRET: secret(),
    TURNSTILE_SECRET: turnstileSecret,
  }
}

/** Builds the complete provisioning plan without contacting Cloudflare. */
export function provisionPlan(tenant: Tenant): ProvisionStep[] {
  assertSafeToken(tenant.slug, 'tenant slug', /^[a-z][a-z0-9-]{1,39}$/)
  assertSafeToken(tenant.d1.name, 'D1 name', /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,62}$/)
  assertSafeToken(tenant.r2.bucket, 'R2 bucket', /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,62}$/)
  const worker = workerName(tenant)
  return [
    { key: 'validate', label: 'validate tenant definition' },
    { key: 'd1', label: 'create D1 database when absent', command: `${WRANGLER} d1 create ${tenant.d1.name}` },
    { key: 'r2', label: 'create R2 bucket when absent', command: `${WRANGLER} r2 bucket create ${tenant.r2.bucket}` },
    { key: 'wrangler', label: 'generate tenant Wrangler bindings', command: 'pnpm gen:wrangler' },
    {
      key: 'secrets',
      label: 'upload tenant secrets',
      command: `${WRANGLER} secret bulk <temporary-secrets-file> --env ${tenant.slug}`,
    },
    {
      key: 'migration',
      label: 'apply backward-compatible Payload migrations',
      command: `CLOUDFLARE_ENV=${tenant.slug} pnpm --filter web exec payload migrate`,
    },
    {
      key: 'deployment',
      label: 'deploy the existing build',
      command: `opennextjs-cloudflare deploy --env=${tenant.slug}`,
    },
    { key: 'seed', label: 'seed settings, template and owner invitation' },
    {
      key: 'senderStatus',
      label: 'read Email Service sender status',
      command: `${WRANGLER} email sending list ${tenant.email.inboundDomain}`,
    },
    { key: 'checklist', label: 'print the manual domain, routing and Turnstile checklist' },
    { key: 'smoke', label: 'run tenant smoke checks', command: `pnpm tenant:smoke ${tenant.slug} --execute` },
    { key: 'validate', label: `confirm Worker ${worker} owns only its tenant bindings` },
  ]
}

function isComplete(key: ProvisionStep['key'], state: Partial<ProvisionState>, tenant: Tenant): boolean {
  if (key === 'validate' || key === 'checklist') return false
  if (key === 'd1' && tenant.d1.id !== undefined) return true
  return state[key] === true
}

function secretsFile(tenant: Tenant, payload: Record<string, string>): string {
  const file = join(process.cwd(), `.tenant-secrets-${tenant.slug}-${String(process.pid)}.json`)
  writeFileSync(file, JSON.stringify(payload), { mode: 0o600 })
  return file
}

/** Executes the provisioning plan, skipping steps already marked complete. */
export async function provisionTenant(tenant: Tenant, deps: ProvisionDependencies): Promise<ProvisionStep[]> {
  const parsed = parseTenant(tenant, `tenant ${tenant.slug}`)
  const state: Partial<ProvisionState> = { ...deps.state }
  const print = deps.print ?? console.log
  const secrets = deps.internalSecret === undefined ? undefined : { INTERNAL_SECRET: deps.internalSecret }
  return runProvisionSteps(
    provisionPlan(parsed),
    { tenant: parsed, deps, state, ...(secrets === undefined ? {} : { secrets }) },
    print,
  )
}

async function runProvisionSteps(
  steps: ProvisionStep[],
  context: StepContext,
  print: (line: string) => void,
): Promise<ProvisionStep[]> {
  const completed: ProvisionStep[] = []
  let secretsFilePath = context.secretsFile
  let secrets = context.secrets
  try {
    for (const step of steps) {
      const result = await runProvisionStep(step, { ...context, secretsFile: secretsFilePath, secrets }, print)
      secretsFilePath = result.secretsFile
      secrets = result.secrets
      completed.push(step)
    }
  } finally {
    if (secretsFilePath !== undefined && existsSync(secretsFilePath)) rmSync(secretsFilePath, { force: true })
  }
  return completed
}

async function shouldSkip(step: ProvisionStep, context: StepContext): Promise<boolean> {
  const { state, tenant, deps } = context
  if (step.key === 'validate' || step.key === 'checklist') return false
  const discovered = deps.check === undefined ? false : await deps.check(step.key)
  if (discovered) state[step.key] = true
  return discovered || isComplete(step.key, state, tenant)
}

async function executeStep(
  step: ProvisionStep,
  context: StepContext,
): Promise<{ secretsFile: string | undefined; secrets?: Record<string, string> }> {
  const { tenant, deps } = context
  if (step.key === 'seed') return executeSeed(tenant, deps, context.secrets)
  const command = commandForStep(step, context)
  const environment = step.key === 'migration' ? { CLOUDFLARE_ENV: tenant.slug } : undefined
  const result = await deps.run(command.value, environment)
  assertCommand(result, command.value)
  if (step.key === 'd1') writeProvisionedD1Id(tenant, deps, result.output)
  return { secretsFile: command.file, ...(command.secrets === undefined ? {} : { secrets: command.secrets }) }
}

function commandForStep(
  step: ProvisionStep,
  context: StepContext,
): { value: string; file?: string; secrets?: Record<string, string> } {
  const { tenant, deps, secretsFile: existingSecretsFile } = context
  if (step.key !== 'secrets') {
    if (step.command === undefined) throw new Error(`provision step ${step.key} has no command`)
    return { value: step.command }
  }
  const secret = deps.turnstileSecret
  if (secret === undefined || secret === '') throw new Error('TURNSTILE_SECRET is required to provision a tenant')
  if (existingSecretsFile !== undefined)
    return { value: `${WRANGLER} secret bulk ${existingSecretsFile} --env ${tenant.slug}`, file: existingSecretsFile }
  const secrets = createSecretPayload(secret)
  const existingInternalSecret = context.secrets?.['INTERNAL_SECRET']
  if (existingInternalSecret !== undefined) secrets['INTERNAL_SECRET'] = existingInternalSecret
  const file = secretsFile(tenant, secrets)
  return {
    value: `${WRANGLER} secret bulk ${file} --env ${tenant.slug}`,
    file,
    secrets,
  }
}

async function runProvisionStep(
  step: ProvisionStep,
  context: StepContext,
  print: (line: string) => void,
): Promise<{ secretsFile: string | undefined; secrets?: Record<string, string> }> {
  if (await shouldSkip(step, context)) {
    print(`SKIP ${step.label}`)
    return { secretsFile: context.secretsFile, ...(context.secrets === undefined ? {} : { secrets: context.secrets }) }
  }
  print(`RUN ${step.label}`)
  if (step.key === 'checklist') print(manualChecklist(context.tenant))
  if (step.key === 'validate' || step.key === 'checklist')
    return { secretsFile: context.secretsFile, ...(context.secrets === undefined ? {} : { secrets: context.secrets }) }
  return executeStep(step, context)
}

async function executeSeed(
  tenant: Tenant,
  deps: ProvisionDependencies,
  secrets: Record<string, string> | undefined,
): Promise<{ secretsFile: string | undefined; secrets?: Record<string, string> }> {
  const secret = secrets?.['INTERNAL_SECRET']
  if (deps.http === undefined || secret === undefined)
    throw new Error('authenticated provisioning client and INTERNAL_SECRET are required for seeding')
  const response = await deps.http.post(
    seedEndpoint(tenant),
    {
      displayName: tenant.displayName,
      template: tenant.template,
      owner: tenant.owner,
      timezone: tenant.timezone,
      locale: tenant.locale,
      currency: tenant.currency,
      intake: tenant.intake,
    },
    secret,
  )
  if (!response.ok) throw new Error(`tenant seed failed (HTTP ${String(response.status)})`)
  return { secretsFile: undefined, secrets }
}

function writeProvisionedD1Id(tenant: Tenant, deps: ProvisionDependencies, output: string): void {
  if (deps.root === undefined) return
  const id = parseD1Id(output)
  if (id === undefined) throw new Error('wrangler d1 create did not return a database id')
  if (deps.writeD1Id !== undefined) deps.writeD1Id(id)
  else updateTenantD1Id(deps.root, tenant, id)
}

/** Formats operator-only steps that cannot be completed by a local dry run. */
export function manualChecklist(tenant: Tenant): string {
  const host = tenant.hostType === 'workers_dev' ? `${workerName(tenant)}.workers.dev` : tenant.host
  const lines = [
    `CHECKLIST ${tenant.slug}`,
    `- confirm custom domain status for ${host ?? 'the tenant host'}`,
    `- configure Email Routing catch-all for ${tenant.email.inboundDomain}`,
    `- verify Turnstile widget hostnames: ${tenant.intake.turnstileHostnames.join(', ')}`,
  ]
  if (tenant.hostType === 'platform') lines.push('- regenerate and deploy ops-mail-router after adding this tenant')
  return lines.join('\n')
}

/** Loads and validates one tenant file for the CLI. */
export function loadTenant(root: string, slug: string): Tenant {
  const file = join(root, 'tenants', `${slug}.jsonc`)
  if (!existsSync(file)) throw new Error(`tenant file not found: ${file}`)
  return parseTenant(parseJsonc(readFileSync(file, 'utf8')), `tenants/${slug}.jsonc`)
}
