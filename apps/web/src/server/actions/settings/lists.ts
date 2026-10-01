'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { actionError, actionFailure, actionOk, type ActionResult } from '../../action-result'
import { requireRole } from '../../auth/context'

const KINDS = { source: 'sources', lostReason: 'lostReasons' } as const
const addSchema = z.object({ kind: z.enum(['source', 'lostReason']), name: z.string().trim().min(1).max(120) }).strict()
const removeSchema = z.object({ kind: z.enum(['source', 'lostReason']), id: z.string().min(1).max(64) }).strict()

// Only these actions are exported: every export of a 'use server' file becomes callable from the client.
/** Adds a lead source or a lost reason; owners and managers only. */
export async function addListItem(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager')
  const parsed = addSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION', 'Enter a name of up to 120 characters.')
  try {
    await context.payload.create({
      collection: KINDS[parsed.data.kind],
      data: { name: parsed.data.name },
      depth: 0,
      overrideAccess: false,
      req: context.req,
    })
    revalidatePath('/settings/lists')
    return actionOk()
  } catch (error) {
    return actionFailure(error, 'addListItem', 'That name may already be on the list.')
  }
}

/** Removes a lead source or lost reason; records that used it keep their data and show it as unset. */
export async function removeListItem(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager')
  const parsed = removeSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION', 'Choose an item.')
  try {
    await context.payload.delete({
      collection: KINDS[parsed.data.kind],
      id: parsed.data.id,
      overrideAccess: false,
      req: context.req,
    })
    revalidatePath('/settings/lists')
    return actionOk()
  } catch (error) {
    return actionFailure(error, 'removeListItem', 'Unable to remove it.')
  }
}
