'use server'

import { z } from 'zod'
import { actionError, actionFailure, actionOk, type ActionResult } from '../../action-result'
import { createApiToken, revokeApiToken } from '../../auth/api-tokens'
import { requireRole } from '../../auth/context'

const createSchema = z.object({ name: z.string().trim().min(1).max(60) }).strict()
const revokeSchema = z.object({ tokenId: z.string().min(1).max(64) }).strict()

// Only these actions are exported: every export of a 'use server' file becomes callable from the client.
/** Makes a personal API token for the signed-in owner or manager; its secret is returned once. */
export async function makeApiToken(input: unknown): Promise<ActionResult<{ token: string }>> {
  const context = await requireRole('owner', 'manager')
  const parsed = createSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION', 'Give the token a name of up to 60 characters.')
  try {
    const token = await createApiToken(context.payload, { userId: String(context.user.id), name: parsed.data.name })
    return token === null
      ? actionError('VALIDATION', 'You have 10 tokens already. Revoke one first.')
      : actionOk({ token })
  } catch (error) {
    return actionFailure(error, 'makeApiToken', 'Unable to make the token.')
  }
}

/** Revokes one of the signed-in user's tokens. */
export async function removeApiToken(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager')
  const parsed = revokeSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION', 'Choose a token.')
  try {
    await revokeApiToken(context.payload, { userId: String(context.user.id), tokenId: parsed.data.tokenId })
    return actionOk()
  } catch (error) {
    return actionFailure(error, 'removeApiToken', 'Unable to revoke the token.')
  }
}
