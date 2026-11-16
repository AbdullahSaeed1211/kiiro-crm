import { asId } from '@ops/kernel'
import type { Actor } from '@ops/platform'
import { describe, expect, it } from 'vitest'
import { inviteMember, resendInvitation } from '../src'
import { memoryIdentity } from './memory-identity'
import { passwordProblem } from '../src/password'

const owner: Actor = { id: asId('owner-1'), role: 'owner', groupIds: [], reportIds: [], active: true }

describe('passwordProblem', () => {
  it('accepts passwords from eight characters while preserving complexity and identity checks', () => {
    expect(passwordProblem('aB3!xY7z')).toBeUndefined()
    expect(passwordProblem('aB3!xY7')).toContain('8 to 128')
    expect(passwordProblem('aaaaaaaa')).toContain('too few different characters')
    expect(passwordProblem('password1')).toContain('too common')
    expect(passwordProblem('12345678')).toContain('too common')
    expect(passwordProblem('secureuser123!', 'secureuser@example.test')).toContain('name from the email')
  })
})

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
