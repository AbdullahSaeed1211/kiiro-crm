'use server'

import { decideQuote } from '@ops/module-billing'
import { revalidatePath } from 'next/cache'
import { actionFailure, toActionResult, type ActionResult } from '../../action-result'
import { portalPublicDeps } from '../../billing/portal-deps'

/** The client accepts or declines a quote from their portal. The token is the only credential. */
export async function answerQuote(input: unknown): Promise<ActionResult> {
  try {
    const result = await decideQuote(await portalPublicDeps(), input)
    if (!result.ok) return toActionResult(result)
    const token = typeof input === 'object' && input !== null && 'token' in input ? String(input.token) : ''
    revalidatePath(`/portal/${token}`, 'layout')
    return { ok: true, data: undefined }
  } catch (error) {
    return actionFailure(error, 'answerQuote', 'Could not save your answer. Try again.')
  }
}
