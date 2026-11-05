'use server'

import { invalidInput } from '@ops/kernel'
import { automationRulesSchema } from '@ops/module-automation'
import { revalidatePath } from 'next/cache'
import { actionFailure, actionOk, toActionResult, type ActionResult } from '../../action-result'
import { requireRole } from '../../auth/context'

const AUTOMATION_PATH = '/settings/automation'

/** Replaces each rule's author with the signed-in person; a value sent by the client is never trusted. */
function withAuthor(input: unknown, actorId: string): unknown {
  if (!Array.isArray(input)) return input
  const rules: readonly unknown[] = input
  return rules.map((rule) =>
    typeof rule === 'object' && rule !== null && !Array.isArray(rule) ? { ...rule, createdById: actorId } : rule,
  )
}

/** Saves the workspace's automation rules; owners and managers only. */
export async function saveAutomationRules(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager')
  const parsed = automationRulesSchema.safeParse(withAuthor(input, context.actor.id))
  if (!parsed.success)
    return toActionResult({
      ok: false,
      error: invalidInput('Each rule needs a name, a trigger and at least one action.', parsed.error.issues),
    })
  try {
    await context.payload.updateGlobal({
      slug: 'settings',
      data: { automationRules: parsed.data },
      overrideAccess: true,
      req: context.req,
    })
    revalidatePath(AUTOMATION_PATH)
    return actionOk()
  } catch (error) {
    return actionFailure(error, 'saveAutomationRules', 'Unable to save automation rules.')
  }
}
