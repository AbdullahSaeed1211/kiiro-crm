import { asId } from '@ops/kernel'
import type { Actor } from '@ops/platform'
import { describe, expect, it } from 'vitest'
import { inviteMember, resendInvitation } from '../src'
import { memoryIdentity } from './memory-identity'

const owner: Actor = { id: asId('owner-1'), role: 'owner', groupIds: [], reportIds: [], active: true }

describe('resendInvitation', () => {
  // The response carries only the new link; that the old link stops working is visible only in the store.
  it('revokes the old invitation and stores only the new token hash', async () => {
    const { deps, invitations } = memoryIdentity(owner)
    await inviteMember(deps, { email: 'new@example.test', role: 'staff' })
    const result = await resendInvitation(deps, { id: 'invitation-1' })
    expect(result).toEqual({ ok: true, value: { token: 'token-2' } })
    expect(invitations.get(asId('invitation-1'))?.status).toBe('revoked')
    expect(invitations.get(asId('invitation-2'))).toMatchObject({ status: 'pending', tokenHash: 'hash-2' })
  })
})
