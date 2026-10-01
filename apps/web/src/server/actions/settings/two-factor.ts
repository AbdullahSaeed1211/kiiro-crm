'use server'

import { z } from 'zod'
import { actionError, actionFailure, actionOk, type ActionResult } from '../../action-result'
import { getProductContext, getWorkspaceSettings, requireRole } from '../../auth/context'
import { beginTwoFactor, checkTwoFactorCode, confirmTwoFactor, removeTwoFactor } from '../../auth/two-factor'

const codeSchema = z.object({ code: z.string().trim().min(6).max(40) }).strict()
const userSchema = z.object({ userId: z.string().min(1).max(64) }).strict()

async function self() {
  const context = await getProductContext()
  const userId = String(context.user.id)
  return { target: { payload: context.payload, req: context.req, userId }, context }
}

/** Starts two-step setup for the signed-in user and returns the key to add to an authenticator app. */
export async function startTwoFactor(): Promise<ActionResult<{ secret: string; uri: string }>> {
  try {
    const { target, context } = await self()
    const { appName } = await getWorkspaceSettings()
    const issuer = typeof appName === 'string' && appName !== '' ? appName : 'Workspace'
    return actionOk(await beginTwoFactor({ ...target, account: String(context.user.email), issuer }))
  } catch (error) {
    return actionFailure(error, 'startTwoFactor', 'Unable to start setup.')
  }
}

/** Turns two-step sign-in on when the app's first code is right; returns the recovery codes, shown once. */
export async function confirmTwoFactorSetup(input: unknown): Promise<ActionResult<{ recoveryCodes: string[] }>> {
  const parsed = codeSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION', 'Enter the 6-digit code from your app.')
  try {
    const { target } = await self()
    const codes = await confirmTwoFactor({ ...target, code: parsed.data.code })
    return codes === null
      ? actionError('VALIDATION', 'That code is not right. Check the app and try again.')
      : actionOk({ recoveryCodes: codes })
  } catch (error) {
    return actionFailure(error, 'confirmTwoFactorSetup', 'Unable to turn on two-step sign-in.')
  }
}

/** Turns two-step sign-in off after a valid code (or recovery code). */
export async function disableTwoFactor(input: unknown): Promise<ActionResult> {
  const parsed = codeSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION', 'Enter a code from your app or a recovery code.')
  try {
    const { target } = await self()
    const verdict = await checkTwoFactorCode({ ...target, code: parsed.data.code })
    if (verdict === 'locked') return actionError('FORBIDDEN', 'Too many wrong codes. Try again in 10 minutes.')
    if (verdict === 'wrong') return actionError('VALIDATION', 'That code is not right.')
    await removeTwoFactor(target)
    return actionOk()
  } catch (error) {
    return actionFailure(error, 'disableTwoFactor', 'Unable to turn off two-step sign-in.')
  }
}

/** Owners clear a teammate's two-step sign-in, for a lost phone; the teammate can set it up again. */
export async function resetMemberTwoFactor(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner')
  const parsed = userSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION', 'Choose a teammate.')
  try {
    await removeTwoFactor({ payload: context.payload, req: context.req, userId: parsed.data.userId })
    return actionOk()
  } catch (error) {
    return actionFailure(error, 'resetMemberTwoFactor', 'Unable to reset.')
  }
}
