'use server'

import { revalidatePath } from 'next/cache'
import { runConvertLead, runCreateLead, runMarkLost, runMoveLead, runUpdateLead } from '@ops/module-crm'
import { getCrmDeps } from '../deps'

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
  const result = await runConvertLead(await getCrmDeps(), input)
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
