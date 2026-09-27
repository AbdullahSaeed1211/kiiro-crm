import { asId, domainError, err, invalidInput, ok, type Result } from '@ops/kernel'
import type { Role } from '@ops/platform'
import type { z } from 'zod'
import type { IdentityDeps } from './ports'
import { inviteMemberSchema, recordIdSchema, saveGroupSchema, saveMemberSchema } from './schema'

const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000

function parse<T>(schema: z.ZodType<T>, input: unknown, message: string): Result<T> {
  const parsed = schema.safeParse(input)
  return parsed.success ? ok(parsed.data) : err(invalidInput(message, parsed.error.issues))
}

const forbidden = (message: string) => err(domainError('FORBIDDEN', message))
const mayManage = (deps: IdentityDeps, role: Role) => deps.can(deps.actor, 'manage_members', { type: 'users', role })
const isManagerUp = (deps: IdentityDeps) => deps.actor.role === 'owner' || deps.actor.role === 'manager'

async function issueInvitation(deps: IdentityDeps, email: string, role: Role): Promise<Result<{ token: string }>> {
  const { token, tokenHash } = await deps.newToken()
  const created = await deps.repo.createInvitation({
    tokenHash,
    email,
    role,
    invitedBy: deps.actor.id,
    expiresAt: deps.now() + INVITATION_LIFETIME_MS,
  })
  return created.ok ? ok({ token }) : created
}

/** Invites a person by email; the plain token is returned once and only its hash is stored (spec §11). */
export async function inviteMember(deps: IdentityDeps, input: unknown): Promise<Result<{ token: string }>> {
  const parsed = parse(inviteMemberSchema, input, 'Email and a valid role are required.')
  if (!parsed.ok) return parsed
  const { email, role } = parsed.value
  if (!mayManage(deps, role)) return forbidden('You cannot invite this role.')
  if (await deps.repo.memberExistsWithEmail(email))
    return err(domainError('CONFLICT', 'An active member already uses this email.'))
  if (await deps.repo.pendingInvitationExists(email))
    return err(domainError('CONFLICT', 'A pending invitation already exists for this email.'))
  return issueInvitation(deps, email, role)
}

/** Revokes a pending invitation so its link stops working. */
export async function revokeInvitation(deps: IdentityDeps, input: unknown): Promise<Result<undefined>> {
  const parsed = parse(recordIdSchema, input, 'Invitation id is required.')
  if (!parsed.ok) return parsed
  if (!isManagerUp(deps)) return forbidden('You cannot revoke this invitation.')
  return deps.repo.revokeInvitation(asId(parsed.value.id))
}

/** Replaces an invitation with a fresh link for the same email and role, and revokes the old one. */
export async function resendInvitation(deps: IdentityDeps, input: unknown): Promise<Result<{ token: string }>> {
  const parsed = parse(recordIdSchema, input, 'Invitation id is required.')
  if (!parsed.ok) return parsed
  const id = asId(parsed.value.id)
  const invitation = await deps.repo.getInvitation(id)
  if (invitation === undefined) return err(domainError('NOT_FOUND', 'Invitation not found.'))
  if (invitation.status === 'accepted' || invitation.status === 'accepting')
    return err(domainError('CONFLICT', 'This invitation has already been accepted.'))
  if (!mayManage(deps, invitation.role)) return forbidden('You cannot resend this invitation.')
  const issued = await issueInvitation(deps, invitation.email.toLowerCase(), invitation.role)
  if (!issued.ok) return issued
  const revoked = await deps.repo.revokeInvitation(id)
  return revoked.ok ? issued : revoked
}

/** Changes a member's role, active flag, groups and manager. The store keeps the last active owner. */
export async function saveMember(deps: IdentityDeps, input: unknown): Promise<Result<undefined>> {
  const parsed = parse(saveMemberSchema, input, 'Member and role are required.')
  if (!parsed.ok) return parsed
  const { id, ...access } = parsed.value
  if (id === deps.actor.id && !access.active)
    return err(domainError('VALIDATION', 'You cannot deactivate your own account.'))
  const currentRole = await deps.repo.getMemberRole(asId(id))
  if (currentRole === undefined) return err(domainError('NOT_FOUND', 'Member not found.'))
  if (!mayManage(deps, currentRole)) return forbidden('You cannot manage this member.')
  if (!mayManage(deps, access.role)) return forbidden('You cannot assign this role.')
  return deps.repo.updateMember(asId(id), {
    role: access.role,
    active: access.active,
    groups: access.groups.map(asId),
    reportsTo: access.reportsTo === null ? null : asId(access.reportsTo),
  })
}

/** Creates a group, or renames it when an id is given. */
export async function saveGroup(deps: IdentityDeps, input: unknown): Promise<Result<undefined>> {
  const parsed = parse(saveGroupSchema, input, 'Group name is required.')
  if (!parsed.ok) return parsed
  if (!isManagerUp(deps)) return forbidden('You cannot manage groups.')
  const { id, name } = parsed.value
  return deps.repo.saveGroup(id === undefined || id === '' ? { name } : { id: asId(id), name })
}

/** Deletes a group. */
export async function deleteGroup(deps: IdentityDeps, input: unknown): Promise<Result<undefined>> {
  const parsed = parse(recordIdSchema, input, 'Group id is required.')
  if (!parsed.ok) return parsed
  if (!isManagerUp(deps)) return forbidden('You cannot manage groups.')
  return deps.repo.deleteGroup(asId(parsed.value.id))
}
