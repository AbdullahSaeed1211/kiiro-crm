import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseJsonc } from '../jsonc'
import { assertCommand, parseD1Id, resourceId, type CommandRunner } from './commands'
import { parseTenant, type Tenant } from '../tenant-schema'

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
}

interface StepContext {
  readonly tenant: Tenant
  readonly deps: ProvisionDependencies
  readonly state: Partial<ProvisionState>
  readonly secretsFile?: string
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
  const worker = workerName(tenant)
  return [
    { key: 'validate', label: 'validate tenant definition' },
    { key: 'd1', label: 'create D1 database when absent', command: `wrangler d1 create ${tenant.d1.name}` },
    { key: 'r2', label: 'create R2 bucket when absent', command: `wrangler r2 bucket create ${tenant.r2.bucket}` },
    { key: 'wrangler', label: 'generate tenant Wrangler bindings', command: 'pnpm gen:wrangler' },
    {
      key: 'secrets',
      label: 'upload tenant secrets',
      command: `wrangler secret bulk <temporary-secrets-file> --env ${tenant.slug}`,
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
    { key: 'seed', label: 'seed settings, template and owner invitation', command: `POST ${seedEndpoint(tenant)}` },
    {
      key: 'senderStatus',
      label: 'read Email Service sender status',
      command: `wrangler email domains list --json --env ${tenant.slug}`,
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

function updateTenantD1Id(root: string, tenant: Tenant, id: string): void {
  const file = join(root, 'tenants', `${tenant.slug}.jsonc`)
  const source = readFileSync(file, 'utf8')
  const needle = new RegExp(`("d1"\\s*:\\s*\\{\\s*"name"\\s*:\\s*"${tenant.d1.name}"\\s*)(\\})`)
  if (!needle.test(source)) throw new Error(`${file}: could not locate d1.name to write database id`)
  writeFileSync(file, source.replace(needle, `$1, "id": "${id}"$2`))
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
  return runProvisionSteps(provisionPlan(parsed), { tenant: parsed, deps, state }, print)
}

async function runProvisionSteps(
  steps: ProvisionStep[],
  context: StepContext,
  print: (line: string) => void,
): Promise<ProvisionStep[]> {
  const completed: ProvisionStep[] = []
  let secretsFilePath = context.secretsFile
  try {
    for (const step of steps) {
      const result = await runProvisionStep(step, { ...context, secretsFile: secretsFilePath }, print)
      secretsFilePath = result.secretsFile
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

async function executeStep(step: ProvisionStep, context: StepContext): Promise<{ secretsFile: string | undefined }> {
  const { tenant, deps } = context
  const command = commandForStep(step, context)
  const environment = step.key === 'migration' ? { CLOUDFLARE_ENV: tenant.slug } : undefined
  const result = await deps.run(command.value, environment)
  assertCommand(result, command.value)
  if (step.key === 'd1') writeProvisionedD1Id(tenant, deps, result.output)
  return { secretsFile: command.file }
}

function commandForStep(step: ProvisionStep, context: StepContext): { value: string; file?: string } {
  const { tenant, deps, secretsFile: existingSecretsFile } = context
  if (step.key !== 'secrets') {
    if (step.command === undefined) throw new Error(`provision step ${step.key} has no command`)
    return { value: step.command }
  }
  const secret = deps.turnstileSecret
  if (secret === undefined || secret === '') throw new Error('TURNSTILE_SECRET is required to provision a tenant')
  const file = existingSecretsFile ?? secretsFile(tenant, createSecretPayload(secret))
  return { value: `wrangler secret bulk ${file} --env ${tenant.slug}`, file }
}

async function runProvisionStep(
  step: ProvisionStep,
  context: StepContext,
  print: (line: string) => void,
): Promise<{ secretsFile: string | undefined }> {
  if (await shouldSkip(step, context)) {
    print(`SKIP ${step.label}`)
    return { secretsFile: context.secretsFile }
  }
  print(`RUN ${step.label}`)
  if (step.key === 'checklist') print(manualChecklist(context.tenant))
  if (step.key === 'validate' || step.key === 'checklist') return { secretsFile: context.secretsFile }
  return executeStep(step, context)
}

function writeProvisionedD1Id(tenant: Tenant, deps: ProvisionDependencies, output: string): void {
  if (deps.root === undefined) return
  const id = parseD1Id(output)
  if (id === undefined) throw new Error('wrangler d1 create did not return a database id')
  if (deps.writeD1Id !== undefined) deps.writeD1Id(id)
  else updateTenantD1Id(deps.root, tenant, id)
}

/** Discovers the idempotency state that Wrangler can expose without changing a resource. */
export async function discoverProvisionState(
  tenant: Tenant,
  run: CommandRunner,
  root: string,
): Promise<Partial<ProvisionState>> {
  const state: Partial<ProvisionState> = {
    d1: tenant.d1.id !== undefined,
    wrangler: existsSync(join(root, 'apps', 'web', 'wrangler.jsonc')),
  }
  const r2 = await run(`wrangler r2 bucket list --json`)
  state.r2 = r2.exitCode === 0 && r2.output.includes(tenant.r2.bucket)
  const secrets = await run(`wrangler secret list --env ${tenant.slug} --json`)
  state.secrets =
    secrets.exitCode === 0 &&
    ['PAYLOAD_SECRET', 'INTERNAL_SECRET', 'TENANT_SECRET', 'TURNSTILE_SECRET'].every((name) =>
      secrets.output.includes(name),
    )
  if (tenant.d1.id === undefined) {
    const databases = await run('wrangler d1 list --json')
    const id = databases.exitCode === 0 ? resourceId(databases.output, tenant.d1.name) : undefined
    if (id !== undefined) {
      state.d1 = true
      updateTenantD1Id(root, tenant, id)
    }
  }
  return state
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
