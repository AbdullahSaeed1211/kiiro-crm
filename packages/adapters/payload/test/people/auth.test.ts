import { APIError } from 'payload'
import { describe, expect, it } from 'vitest'
import { passwordPolicy, blockInactiveUser, protectLastActiveOwner } from '../../src/hooks/auth/auth'
import { invitationExpiresAt, invitationUsable } from '../../src/collections/people/invitations'

const EMAIL = 'person@example.test'

describe('people auth invariants', () => {
  it('enforces the password policy on every set-password path', () => {
    expect(passwordPolicy('short', EMAIL)).not.toBe(true)
    expect(passwordPolicy(EMAIL, EMAIL)).not.toBe(true)
    expect(passwordPolicy('a secure password 123', EMAIL)).toBe(true)
  })

  it('blocks inactive users after credentials are verified', () => {
    expect(() => {
      blockInactiveUser({ user: { id: 'u1', active: false } } as never)
    }).toThrow(APIError)
    expect(() => {
      blockInactiveUser({ user: { id: 'u1', active: true } } as never)
    }).not.toThrow()
  })

  it('protects the final active owner', async () => {
    const req = { payload: { count: () => Promise.resolve({ totalDocs: 1 }) } }
    await expect(
      protectLastActiveOwner({
        data: { role: 'staff' },
        originalDoc: { id: 'u1', role: 'owner', active: true },
        req,
      } as never),
    ).rejects.toThrow('last active owner')
    const safeReq = { payload: { count: () => Promise.resolve({ totalDocs: 2 }) } }
    await expect(
      protectLastActiveOwner({
        data: { active: false },
        originalDoc: { id: 'u1', role: 'owner', active: true },
        req: safeReq,
      } as never),
    ).resolves.toMatchObject({ active: false })
  })
})

describe('invitations', () => {
  it('expires after seven days and rejects non-pending invitations', () => {
    const now = 1_000_000
    expect(invitationExpiresAt(now)).toBe(now + 604_800_000)
    expect(invitationUsable({ status: 'pending', expiresAt: invitationExpiresAt(now) }, now)).toBe(true)
    expect(invitationUsable({ status: 'revoked', expiresAt: invitationExpiresAt(now) }, now)).toBe(false)
    expect(invitationUsable({ status: 'pending', expiresAt: now }, now)).toBe(false)
  })
})
