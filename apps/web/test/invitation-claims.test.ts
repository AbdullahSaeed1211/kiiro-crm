/* eslint-disable max-lines-per-function, max-statements */
import { describe, expect, it } from 'vitest'
import {
  claimInvitationWithCas,
  completeInvitationClaim,
  createInvitationClaimId,
  type InvitationClaimDocument,
  type InvitationClaimStore,
} from '../src/server/auth/invitation-claims'

// The fake store models Payload's atomic compare-and-set update for the claim and completion rows.
describe('invitation claim concurrency', () => {
  it('allows one of two same-token passwords to create, complete and log in', async () => {
    let invitation: InvitationClaimDocument = {
      id: 'invite-1',
      tokenHash: 'hash-1',
      status: 'pending',
      expiresAt: Date.now() + 60_000,
    }
    const account = { password: undefined as string | undefined }
    let creates = 0
    let completions = 0
    let logins = 0
    let reads = 0
    let releaseReads!: () => void
    const readGate = new Promise<void>((resolve) => {
      releaseReads = resolve
    })
    const store: InvitationClaimStore = {
      find: async () => {
        reads += 1
        if (reads === 2) releaseReads()
        await readGate
        return { docs: [invitation] }
      },
      update: (options) => {
        const where = JSON.stringify(options.where)
        const pending = invitation.status === 'pending' && where.includes('pending')
        const accepting = invitation.status === 'accepting' && where.includes(String(invitation.claimId))
        if (!pending && !accepting) return Promise.resolve({ docs: [] })
        const data = options.data as Record<string, unknown>
        invitation = { ...invitation, ...data }
        return Promise.resolve(invitation)
      },
    }
    const accept = async (password: string) => {
      const claim = await claimInvitationWithCas({
        store,
        tokenHash: 'hash-1',
        claimId: createInvitationClaimId(),
        req: {},
      })
      if (claim.kind !== 'claimed') return 409
      if (account.password === undefined) {
        creates += 1
        account.password = password
      }
      const completed = await completeInvitationClaim({
        store,
        invitationId: claim.document.id,
        claimId: String(claim.document.claimId),
        req: {},
      })
      if (!completed) return 409
      completions += 1
      logins += 1
      return 200
    }

    const results = await Promise.all([accept('first-password-123'), accept('second-password-456')])
    expect(results.sort()).toEqual([200, 409])
    expect(creates).toBe(1)
    expect(completions).toBe(1)
    expect(logins).toBe(1)
    expect(['first-password-123', 'second-password-456']).toContain(account.password)
    expect(invitation.status).toBe('accepted')
  })
})
