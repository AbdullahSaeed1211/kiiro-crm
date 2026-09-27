import type { Id, Result } from '@ops/kernel'
import type { Actor, Can, Role } from '@ops/platform'

/** An invitation as the membership commands read it. */
export interface InvitationRecord {
  readonly id: Id
  readonly email: string
  readonly role: Role
  readonly status: 'pending' | 'accepting' | 'accepted' | 'revoked' | 'expired'
}

/** A member's access fields. */
export interface MemberAccess {
  readonly role: Role
  readonly active: boolean
  readonly groups: readonly Id[]
  readonly reportsTo: Id | null
}

/** A new pending invitation; only the token hash is stored. */
export interface InvitationDraft {
  readonly tokenHash: string
  readonly email: string
  readonly role: Role
  readonly invitedBy: Id
  readonly expiresAt: number
}

/** Persistence for members, invitations and groups. Writes that the store rejects come back as failures. */
export interface IdentityRepository {
  memberExistsWithEmail(email: string): Promise<boolean>
  pendingInvitationExists(email: string): Promise<boolean>
  createInvitation(draft: InvitationDraft): Promise<Result<undefined>>
  getInvitation(id: Id): Promise<InvitationRecord | undefined>
  revokeInvitation(id: Id): Promise<Result<undefined>>
  getMemberRole(id: Id): Promise<Role | undefined>
  updateMember(id: Id, access: MemberAccess): Promise<Result<undefined>>
  saveGroup(group: Readonly<{ id?: Id; name: string }>): Promise<Result<undefined>>
  deleteGroup(id: Id): Promise<Result<undefined>>
}

/** A fresh invitation token and the hash that is stored for it. */
export interface InvitationToken {
  readonly token: string
  readonly tokenHash: string
}

/** Everything the membership commands need. */
export interface IdentityDeps {
  readonly actor: Actor
  readonly can: Can
  readonly repo: IdentityRepository
  readonly now: () => number
  readonly newToken: () => Promise<InvitationToken>
}
