import { asId, ok, type Id } from '@ops/kernel'
import { can, type Actor, type Role } from '@ops/platform'
import type { IdentityDeps, IdentityRepository, InvitationRecord } from '../src/ports'

/** In-memory membership store for command tests; invitations keep their stored hash for inspection. */
export function memoryIdentity(actor: Actor) {
  const invitations = new Map<Id, InvitationRecord & { tokenHash: string }>()
  const roles = new Map<Id, Role>([[actor.id, actor.role]])
  let sequence = 0
  const repo: IdentityRepository = {
    memberExistsWithEmail: () => Promise.resolve(false),
    pendingInvitationExists: (email) =>
      Promise.resolve([...invitations.values()].some((row) => row.email === email && row.status === 'pending')),
    createInvitation: (draft) => {
      sequence += 1
      const id = asId(`invitation-${String(sequence)}`)
      invitations.set(id, { id, email: draft.email, role: draft.role, status: 'pending', tokenHash: draft.tokenHash })
      return Promise.resolve(ok(undefined))
    },
    getInvitation: (id) => Promise.resolve(invitations.get(id)),
    revokeInvitation: (id) => {
      const row = invitations.get(id)
      if (row !== undefined) invitations.set(id, { ...row, status: 'revoked' })
      return Promise.resolve(ok(undefined))
    },
    getMemberRole: (id) => Promise.resolve(roles.get(id)),
    updateMember: () => Promise.resolve(ok(undefined)),
    saveGroup: () => Promise.resolve(ok(undefined)),
    deleteGroup: () => Promise.resolve(ok(undefined)),
  }
  let tokens = 0
  const deps: IdentityDeps = {
    actor,
    can,
    repo,
    now: () => 1_800_000_000_000,
    newToken: () => {
      tokens += 1
      return Promise.resolve({ token: `token-${String(tokens)}`, tokenHash: `hash-${String(tokens)}` })
    },
  }
  return { deps, invitations }
}
