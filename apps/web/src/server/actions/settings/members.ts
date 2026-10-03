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
import { recordAuditEvent, type AuditEvent } from '../../audit/record'

/** A text value from an action's input, or an empty string. */
function field(input: unknown, name: string): string {
  const value: unknown = typeof input === 'object' && input !== null ? Reflect.get(input, name) : undefined
  return typeof value === 'string' ? value : ''
}

/** The name and email of a member, for the audit summary; empty when the person cannot be found. */
async function memberLabel(id: string): Promise<string> {
  if (id === '') return ''
  const context = await requireRole('owner', 'manager')
  const user = await context.payload
    .findByID({ collection: 'users', id, depth: 0, overrideAccess: true, req: context.req })
    .catch(() => null)
  return user === null ? id : `${user.name} <${user.email}>`
}

const MEMBERS_SETTINGS_PATH = '/settings/members'
const GROUPS_SETTINGS_PATH = '/settings/groups'

/** Runs a membership command as an owner or manager, refreshes `path` on success and hides unexpected errors. */
async function run<T>(
  command: (deps: Awaited<ReturnType<typeof identityDeps>>) => Promise<Result<T>>,
  failure: Readonly<{ context: string; fallback: string; path: string; audit?: AuditEvent }>,
): Promise<ActionResult<T>> {
  const context = await requireRole('owner', 'manager')
  try {
    const result = await command(await identityDeps(context))
    if (result.ok) {
      revalidatePath(failure.path)
      if (failure.audit !== undefined) await recordAuditEvent(context, failure.audit)
    }
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
    audit: { verb: 'member.invited', summary: field(input, 'email'), data: { role: field(input, 'role') } },
  })
  return result.ok ? { ok: true, data: { ...result.data, inviteUrl: invitationUrl(result.data.token) } } : result
}

export async function revokeInvitation(input: unknown): Promise<ActionResult> {
  return run((deps) => revokeInvitationCommand(deps, input), {
    context: 'revokeInvitation',
    fallback: 'Unable to revoke invitation.',
    path: MEMBERS_SETTINGS_PATH,
    audit: { verb: 'member.invitation_revoked', summary: field(input, 'id') },
  })
}

export async function resendInvitation(input: unknown): Promise<ActionResult<{ inviteUrl: string }>> {
  const result = await run((deps) => resendInvitationCommand(deps, input), {
    context: 'resendInvitation',
    fallback: 'Unable to resend invitation.',
    path: MEMBERS_SETTINGS_PATH,
    audit: { verb: 'member.invitation_resent', summary: field(input, 'id') },
  })
  return result.ok ? { ok: true, data: { inviteUrl: invitationUrl(result.data.token) } } : result
}

export async function saveMember(input: unknown): Promise<ActionResult> {
  const summary = await memberLabel(field(input, 'id'))
  return run((deps) => saveMemberCommand(deps, input), {
    context: 'saveMember',
    fallback: 'Unable to update member access.',
    path: MEMBERS_SETTINGS_PATH,
    audit: {
      verb: 'member.access_changed',
      summary,
      data: { role: field(input, 'role'), active: Reflect.get(Object(input), 'active') === true },
    },
  })
}

export async function saveGroup(input: unknown): Promise<ActionResult> {
  return run((deps) => saveGroupCommand(deps, input), {
    context: 'saveGroup',
    fallback: 'Unable to save group.',
    path: GROUPS_SETTINGS_PATH,
    audit: { verb: 'group.saved', summary: field(input, 'name') },
  })
}

export async function deleteGroup(input: unknown): Promise<ActionResult> {
  return run((deps) => deleteGroupCommand(deps, input), {
    context: 'deleteGroup',
    fallback: 'Unable to delete group.',
    path: GROUPS_SETTINGS_PATH,
    audit: { verb: 'group.deleted', summary: field(input, 'id') },
  })
}
