'use server'

import type { Result } from '@ops/kernel'
import { createLead, createContact, createOrganization } from '@ops/module-crm'
import { revalidatePath } from 'next/cache'
import { crmDeps } from '../../container'
import { toActionResult, type ActionResult } from '../../action-result'

export type QuickCreateResult = ActionResult<{ readonly id: string; readonly updatedAt: number }>

function resultOf(result: Result<{ readonly id: string; readonly updatedAt: number }>): QuickCreateResult {
  if (result.ok) {
    return { ok: true, data: { id: result.value.id, updatedAt: result.value.updatedAt } }
  }
  return toActionResult(result)
}

export async function quickCreateLead(input: unknown): Promise<QuickCreateResult> {
  const result = await createLead(await crmDeps(), input)
  if (result.ok) {
    revalidatePath('/leads')
    revalidatePath('/leads/board')
    revalidatePath(`/leads/${result.value.id}`)
  }
  return resultOf(result)
}

export async function quickCreateContact(input: unknown): Promise<QuickCreateResult> {
  const result = await createContact(await crmDeps(), input)
  if (result.ok) {
    revalidatePath('/contacts')
    revalidatePath(`/contacts/${result.value.id}`)
  }
  return resultOf(result)
}

export async function quickCreateOrganization(input: unknown): Promise<QuickCreateResult> {
  const result = await createOrganization(await crmDeps(), input)
  if (result.ok) {
    revalidatePath('/organizations')
    revalidatePath(`/organizations/${result.value.id}`)
  }
  return resultOf(result)
}
