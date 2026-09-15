import { createHash } from 'node:crypto'
import { parseTenant, type Tenant } from '../tenant-schema'
import { provisionPlan } from './plan'
import type { ProvisionState, ProvisionStep } from './types'

export type OperatorRunStatus = 'draft' | 'approved' | 'running' | 'paused' | 'failed' | 'complete' | 'cancelled'

export interface OperatorRun {
  readonly id: string
  readonly idempotencyKey: string
  readonly tenant: Tenant
  readonly plan: readonly ProvisionStep[]
  readonly status: OperatorRunStatus
  readonly state: Partial<ProvisionState>
  readonly currentStep?: ProvisionStep['key']
  readonly error?: string
  readonly createdAt: number
  readonly updatedAt: number
}

/** Registry boundary for an operator control plane. Implementations may be D1-backed or a CLI store. */
export interface OperatorRegistry {
  getByIdempotency(key: string): Promise<OperatorRun | undefined>
  insert(run: OperatorRun): Promise<void>
  update(run: OperatorRun): Promise<void>
}

export function previewOperatorRun(input: unknown, source = 'operator request'): OperatorRun {
  const tenant = parseTenant(input, source)
  const now = Date.now()
  const idempotencyKey = createHash('sha256').update(JSON.stringify(tenant)).digest('hex').slice(0, 32)
  return {
    id: crypto.randomUUID(),
    idempotencyKey,
    tenant,
    plan: provisionPlan(tenant),
    status: 'draft',
    state: {},
    createdAt: now,
    updatedAt: now,
  }
}

/** Collision-safe submit: the same idempotency key always returns the existing run. */
export async function submitOperatorRun(registry: OperatorRegistry, run: OperatorRun): Promise<OperatorRun> {
  const existing = await registry.getByIdempotency(run.idempotencyKey)
  if (existing !== undefined) return existing
  const approved = { ...run, status: 'approved' as const, updatedAt: Date.now() }
  await registry.insert(approved)
  return approved
}

export function redactOperatorError(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error)
  return text.replaceAll(/(secret|token|password|authorization)[=:][^\s,;]+/giu, '$1=[REDACTED]').slice(0, 500)
}

export function canRetryOperatorRun(run: OperatorRun): boolean {
  return run.status === 'failed' || run.status === 'paused'
}
