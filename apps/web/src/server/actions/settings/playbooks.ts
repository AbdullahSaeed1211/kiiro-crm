'use server'

import { invalidInput } from '@ops/kernel'
import { playbooksSchema } from '@ops/module-work'
import { revalidatePath } from 'next/cache'
import { actionFailure, actionOk, toActionResult, type ActionResult } from '../../action-result'
import { requireRole } from '../../auth/context'

/** Saves the tenant's onboarding playbooks; owners and managers only, at most one runs on won deals. */
export async function savePlaybooks(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager')
  const parsed = playbooksSchema.safeParse(input)
  if (!parsed.success)
    return toActionResult({ ok: false, error: invalidInput('Check the playbooks and try again.', parsed.error.issues) })
  try {
    await context.payload.updateGlobal({
      slug: 'settings',
      data: { playbooks: parsed.data },
      overrideAccess: true,
      req: context.req,
    })
    revalidatePath('/settings/playbooks')
    return actionOk()
  } catch (error) {
    return actionFailure(error, 'savePlaybooks', 'Unable to save playbooks.')
  }
}
