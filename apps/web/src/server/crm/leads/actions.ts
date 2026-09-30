'use server'

import { revalidatePath } from 'next/cache'
import {
  assignLeads,
  moveLeads,
  runConvertLead,
  runCreateLead,
  runMarkLost,
  runMoveLead,
  runUpdateLead,
} from '@ops/module-crm'
import { crmDeps } from '../../container'
import { getWorkspaceSettings } from '../../auth/context'
import { applyWorkspaceCurrency } from '../workspace-currency'
import { toActionResult, type ActionResult } from '../../action-result'

const BOARD_PATH = '/leads/board'

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

/** Sets one owner on the selected leads and reports how many changed. */
export async function assignLeadsAction(input: unknown): Promise<ActionResult<{ updated: number; skipped: number }>> {
  const result = await assignLeads(await crmDeps(), input)
  if (result.ok) revalidatePath('/leads')
  return toActionResult(result)
}

/** Moves the selected leads to one open stage and reports how many changed. */
export async function moveLeadsAction(input: unknown): Promise<ActionResult<{ updated: number; skipped: number }>> {
  const result = await moveLeads(await crmDeps(), input)
  if (result.ok) {
    revalidatePath('/leads')
    revalidatePath(BOARD_PATH)
  }
  return toActionResult(result)
}

/** Moves a lead between workflow stages for board interactions. */
export async function moveLead(input: unknown): Promise<ActionResult<{ stageId: string; updatedAt: number }>> {
  const result = await runMoveLead(await crmDeps(), input)
  if (result.ok) {
    revalidatePath('/leads')
    revalidatePath(BOARD_PATH)
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
    revalidatePath(BOARD_PATH)
    revalidatePath(`/leads/${result.value.id}`)
  }
  return toActionResult(result)
}

/** Marks a lead lost with a reason and optional note. */
export async function markLost(input: unknown): Promise<ActionResult<unknown>> {
  const result = await runMarkLost(await crmDeps(), input)
  if (result.ok) {
    revalidatePath('/leads')
    revalidatePath(BOARD_PATH)
    revalidatePath(`/leads/${result.value.id}`)
  }
  return toActionResult(result)
}
