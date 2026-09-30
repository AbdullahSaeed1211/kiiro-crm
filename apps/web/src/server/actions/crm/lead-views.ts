'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { actionError, actionFailure, actionOk, type ActionResult } from '../../action-result'
import { getRequestContext } from '../../container'

const saveLeadViewSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    filter: z
      .object({
        q: z.string().trim().max(200).optional(),
        stages: z.array(z.string().min(1)).max(20).optional(),
        source: z.string().optional(),
        owner: z.string().optional(),
      })
      .strict(),
  })
  .strict()

/** Saves the current lead-list filters as a personal view of the signed-in user. */
export async function saveLeadView(input: unknown): Promise<ActionResult> {
  const parsed = saveLeadViewSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION', 'Give the view a name.')
  const { payload, req, actor } = await getRequestContext()
  try {
    await payload.create({
      collection: 'savedViews',
      data: {
        recordType: 'lead',
        owner: String(actor.id),
        name: parsed.data.name,
        kind: 'table',
        filter: parsed.data.filter,
        sort: { field: 'createdAt', direction: 'desc' },
        columns: [],
      },
      overrideAccess: false,
      req,
    })
    revalidatePath('/leads')
    return actionOk()
  } catch (error) {
    return actionFailure(error, 'saveLeadView', 'Unable to save the view.')
  }
}
