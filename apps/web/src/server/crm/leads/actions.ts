'use server'

import { revalidatePath } from 'next/cache'
import { asId } from '@ops/kernel'
import { runConvertLead, runCreateLead, runMarkLost, runMoveLead, runUpdateLead } from '@ops/module-crm'
import { crmDeps } from '../../container'
import { getWorkspaceSettings } from '../../auth/context'
import { applyWorkspaceCurrency } from '../workspace-currency'
import { leadStageMoveError } from './types'
import { actionError, toActionResult, type ActionResult } from '../../action-result'

function moveInput(input: unknown): { leadId: string; toStageId: string } | null {
  if (typeof input !== 'object' || input === null) return null
  const value = input as { leadId?: unknown; toStageId?: unknown }
  return typeof value.leadId === 'string' && typeof value.toStageId === 'string'
    ? { leadId: value.leadId, toStageId: value.toStageId }
    : null
}

async function validateLeadMoveDestination(input: unknown): Promise<ActionResult<void> | null> {
  const value = moveInput(input)
  if (value === null) return actionError('VALIDATION', 'Choose a valid lead stage.')
  const deps = await crmDeps()
  const lead = await deps.repo.get('lead', asId(value.leadId))
  if (lead === undefined) return actionError('NOT_FOUND', 'lead not found')
  const workflow = await deps.repo.loadWorkflow(lead.workflowId)
  const stage = workflow?.stages.find((candidate) => candidate.id === asId(value.toStageId))
  const error = stage === undefined ? null : leadStageMoveError(stage)
  return error === null ? null : actionError('VALIDATION', error)
}

/** Creates a lead and revalidates the Leads routes. */
export async function createLead(input: unknown): Promise<ActionResult<unknown>> {
  return toActionResult(await runCreateLead(await crmDeps(), input))
}

/** Updates a lead using its expected version. */
export async function updateLead(input: unknown): Promise<ActionResult<unknown>> {
  const result = await runUpdateLead(await crmDeps(), input)
  if (result.ok) revalidatePath('/leads')
  return toActionResult(result)
}

/** Moves a lead between workflow stages for board interactions. */
export async function moveLead(input: unknown): Promise<ActionResult<{ stageId: string; updatedAt: number }>> {
  const invalid = await validateLeadMoveDestination(input)
  if (invalid !== null) return invalid as ActionResult<never>
  const result = await runMoveLead(await crmDeps(), input)
  if (result.ok) {
    revalidatePath('/leads')
    revalidatePath('/leads/board')
    return { ok: true, data: { stageId: result.value.stageId, updatedAt: result.value.updatedAt } }
  }
  return { ok: false, error: { code: result.error.code, message: result.error.message } }
}

/** Converts a lead into an organization/contact/deal set. */
export async function convertLead(input: unknown): Promise<ActionResult<unknown>> {
  const [deps, settings] = await Promise.all([crmDeps(), getWorkspaceSettings()])
  const currency = typeof settings.currency === 'string' ? settings.currency : 'USD'
  const result = await runConvertLead(deps, applyWorkspaceCurrency(input, currency, true))
  if (result.ok) {
    revalidatePath('/leads')
    revalidatePath('/leads/board')
    revalidatePath(`/leads/${result.value.id}`)
  }
  return toActionResult(result)
}

/** Marks a lead lost with a reason and optional note. */
export async function markLost(input: unknown): Promise<ActionResult<unknown>> {
  const result = await runMarkLost(await crmDeps(), input)
  if (result.ok) {
    revalidatePath('/leads')
    revalidatePath('/leads/board')
    revalidatePath(`/leads/${result.value.id}`)
  }
  return toActionResult(result)
}
