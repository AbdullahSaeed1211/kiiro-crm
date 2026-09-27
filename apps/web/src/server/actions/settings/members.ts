'use server'

import {
  deleteGroup as deleteGroupCommand,
  inviteMember as inviteMemberCommand,
  resendInvitation as resendInvitationCommand,
  revokeInvitation as revokeInvitationCommand,
  saveGroup as saveGroupCommand,
  saveMember as saveMemberCommand,
} from '@ops/module-identity'
import type { Result } from '@ops/kernel'
import { revalidatePath } from 'next/cache'
import { requireRole } from '../../auth/context'
import { actionFailure, toActionResult, type ActionResult } from '../../action-result'
import { identityDeps } from '../../container'
import { invitationUrl } from '../../auth/invitation-url'

const MEMBERS_SETTINGS_PATH = '/settings/members'
const GROUPS_SETTINGS_PATH = '/settings/groups'

/** Runs a membership command as an owner or manager, refreshes `path` on success and hides unexpected errors. */
async function run<T>(
  command: (deps: Awaited<ReturnType<typeof identityDeps>>) => Promise<Result<T>>,
  failure: Readonly<{ context: string; fallback: string; path: string }>,
): Promise<ActionResult<T>> {
  const context = await requireRole('owner', 'manager')
  try {
    const result = await command(await identityDeps(context))
    if (result.ok) revalidatePath(failure.path)
    return toActionResult(result)
  } catch (error) {
    return actionFailure(error, failure.context, failure.fallback)
  }
}

export async function inviteMember(input: unknown): Promise<ActionResult<{ token: string; inviteUrl: string }>> {
  const result = await run((deps) => inviteMemberCommand(deps, input), {
    context: 'inviteMember',
    fallback: 'Unable to create invitation.',
    path: MEMBERS_SETTINGS_PATH,
  })
  return result.ok ? { ok: true, data: { ...result.data, inviteUrl: invitationUrl(result.data.token) } } : result
}

export async function revokeInvitation(input: unknown): Promise<ActionResult> {
  return run((deps) => revokeInvitationCommand(deps, input), {
    context: 'revokeInvitation',
    fallback: 'Unable to revoke invitation.',
    path: MEMBERS_SETTINGS_PATH,
  })
}

export async function resendInvitation(input: unknown): Promise<ActionResult<{ inviteUrl: string }>> {
  const result = await run((deps) => resendInvitationCommand(deps, input), {
    context: 'resendInvitation',
    fallback: 'Unable to resend invitation.',
    path: MEMBERS_SETTINGS_PATH,
  })
  return result.ok ? { ok: true, data: { inviteUrl: invitationUrl(result.data.token) } } : result
}

export async function saveMember(input: unknown): Promise<ActionResult> {
  return run((deps) => saveMemberCommand(deps, input), {
    context: 'saveMember',
    fallback: 'Unable to update member access.',
    path: MEMBERS_SETTINGS_PATH,
  })
}

export async function saveGroup(input: unknown): Promise<ActionResult> {
  return run((deps) => saveGroupCommand(deps, input), {
    context: 'saveGroup',
    fallback: 'Unable to save group.',
    path: GROUPS_SETTINGS_PATH,
  })
}

export async function deleteGroup(input: unknown): Promise<ActionResult> {
  return run((deps) => deleteGroupCommand(deps, input), {
    context: 'deleteGroup',
    fallback: 'Unable to delete group.',
    path: GROUPS_SETTINGS_PATH,
  })
}
