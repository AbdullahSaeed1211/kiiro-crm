'use server'

import { revalidatePath } from 'next/cache'
import { asId } from '@ops/kernel'
import { runConvertLead, runCreateLead, runMarkLost, runMoveLead, runUpdateLead } from '@ops/module-crm'
import { getCrmDeps } from '../deps'
import { getWorkspaceSettings } from '../../auth/context'
import { applyWorkspaceCurrency } from '../workspace-currency'
import { leadStageMoveError } from './types'

export type LeadActionResult<T = unknown> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: { readonly code: string; readonly message: string } }

function adapt<T>(
  result:
    | { readonly ok: true; readonly value: unknown }
    | { readonly ok: false; readonly error: { readonly code: string; readonly message: string } },
): LeadActionResult<T> {
  return result.ok ? { ok: true, data: result.value as T } : { ok: false, error: result.error }
}

interface LeadActionError {
  readonly ok: false
  readonly error: { readonly code: string; readonly message: string }
}

function invalidTerminalMove(message: string): LeadActionError {
  return { ok: false, error: { code: 'VALIDATION', message } }
}

function moveInput(input: unknown): { leadId: string; toStageId: string } | null {
  if (typeof input !== 'object' || input === null) return null
  const value = input as { leadId?: unknown; toStageId?: unknown }
  return typeof value.leadId === 'string' && typeof value.toStageId === 'string'
    ? { leadId: value.leadId, toStageId: value.toStageId }
    : null
}

async function validateLeadMoveDestination(input: unknown): Promise<LeadActionError | null> {
  const value = moveInput(input)
  if (value === null) return invalidTerminalMove('Choose a valid lead stage.')
  const deps = await getCrmDeps()
  const lead = await deps.repo.get('lead', asId(value.leadId))
  if (lead === undefined) return { ok: false, error: { code: 'NOT_FOUND', message: 'lead not found' } }
  const workflow = await deps.repo.loadWorkflow(lead.workflowId)
  const stage = workflow?.stages.find((candidate) => candidate.id === asId(value.toStageId))
  const error = stage === undefined ? null : leadStageMoveError(stage)
  return error === null ? null : invalidTerminalMove(error)
}

/** Creates a lead and revalidates the Leads routes. */
export async function createLead(input: unknown): Promise<LeadActionResult> {
  return adapt(await runCreateLead(await getCrmDeps(), input))
}

/** Updates a lead using its expected version. */
export async function updateLead(input: unknown): Promise<LeadActionResult> {
  const result = await runUpdateLead(await getCrmDeps(), input)
  if (result.ok) revalidatePath('/leads')
  return adapt(result)
}

/** Moves a lead between workflow stages for board interactions. */
export async function moveLead(input: unknown): Promise<LeadActionResult<{ stageId: string; updatedAt: number }>> {
  const invalid = await validateLeadMoveDestination(input)
  if (invalid !== null) return invalid
  const result = await runMoveLead(await getCrmDeps(), input)
  if (result.ok) {
    revalidatePath('/leads')
    revalidatePath('/leads/board')
    return { ok: true, data: { stageId: result.value.stageId, updatedAt: result.value.updatedAt } }
  }
  return { ok: false, error: result.error }
}

/** Converts a lead into an organization/contact/deal set. */
export async function convertLead(input: unknown): Promise<LeadActionResult> {
  const [deps, settings] = await Promise.all([getCrmDeps(), getWorkspaceSettings()])
  const currency = typeof settings.currency === 'string' ? settings.currency : 'USD'
  const result = await runConvertLead(deps, applyWorkspaceCurrency(input, currency, true))
  if (result.ok) {
    revalidatePath('/leads')
    revalidatePath('/leads/board')
    revalidatePath(`/leads/${result.value.id}`)
  }
  return adapt(result)
}

/** Marks a lead lost with a reason and optional note. */
export async function markLost(input: unknown): Promise<LeadActionResult> {
  const result = await runMarkLost(await getCrmDeps(), input)
  if (result.ok) {
    revalidatePath('/leads')
    revalidatePath('/leads/board')
    revalidatePath(`/leads/${result.value.id}`)
  }
  return adapt(result)
}
