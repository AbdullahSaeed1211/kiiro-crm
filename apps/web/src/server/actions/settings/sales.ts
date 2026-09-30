'use server'

import { invalidInput } from '@ops/kernel'
import { leadRulesSchema } from '@ops/module-crm'
import { emailTemplatesSchema } from '@ops/module-mail'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { actionFailure, actionOk, toActionResult, type ActionResult } from '../../action-result'
import { requireRole } from '../../auth/context'

const SALES_PATH = '/settings/sales'

const responseTargetSchema = z.object({ hours: z.number().int().min(0).max(720) }).strict()

/** Validates `input` and writes `data(parsed)` to the workspace settings; owners and managers only. */
async function saveSetting<T>(
  input: unknown,
  save: {
    readonly schema: z.ZodType<T>
    readonly data: (value: T) => Record<string, unknown>
    readonly name: string
    readonly hint: string
  },
): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager')
  const parsed = save.schema.safeParse(input)
  if (!parsed.success) return toActionResult({ ok: false, error: invalidInput(save.hint, parsed.error.issues) })
  try {
    await context.payload.updateGlobal({
      slug: 'settings',
      data: save.data(parsed.data),
      overrideAccess: true,
      req: context.req,
    })
    revalidatePath(SALES_PATH)
    return actionOk()
  } catch (error) {
    return actionFailure(error, save.name, 'Unable to save.')
  }
}

/** Sets how many hours a new lead may wait for a first response before it is flagged; 0 turns the flag off. */
export async function saveResponseTarget(input: unknown): Promise<ActionResult> {
  return saveSetting(input, {
    schema: responseTargetSchema,
    data: ({ hours }) => ({ responseTargetHours: hours }),
    name: 'saveResponseTarget',
    hint: 'Enter a whole number of hours from 0 to 720.',
  })
}

/** Saves the workspace's reusable email templates. */
export async function saveEmailTemplates(input: unknown): Promise<ActionResult> {
  return saveSetting(input, {
    schema: emailTemplatesSchema,
    data: (templates) => ({ emailTemplates: templates }),
    name: 'saveEmailTemplates',
    hint: 'Each template needs a name, a subject and a message.',
  })
}

/** Saves the rules that hand new leads to people. */
export async function saveLeadRules(input: unknown): Promise<ActionResult> {
  return saveSetting(input, {
    schema: leadRulesSchema,
    data: (rules) => ({ automations: rules }),
    name: 'saveLeadRules',
    hint: 'Each rule needs a name and at least one person.',
  })
}
