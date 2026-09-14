/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { APIError } from 'payload'
import { describe, expect, it } from 'vitest'
import {
  passwordPolicy,
  blockInactiveUser,
  protectLastActiveOwner,
  enforceUserMutation,
  authHooks,
} from '../../src/hooks/auth/auth'
import { userFieldRead } from '../../src/collections/people/access'
import { invitationExpiresAt, invitationUsable } from '../../src/collections/people/invitations'

const EMAIL = 'person@example.test'

// The auth suite intentionally keeps boundary cases together.
// eslint-disable-next-line max-lines-per-function
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

  it('blocks staff and manager privilege escalation at the mutation hook', async () => {
    const staffReq = {
      user: { id: 's1', role: 'staff', active: true },
      payload: { find: () => Promise.resolve({ docs: [] }) },
    }
    await expect(
      enforceUserMutation({
        operation: 'update',
        data: { role: 'owner' },
        originalDoc: { id: 's1', role: 'staff' },
        req: staffReq,
      } as never),
    ).rejects.toThrow('outside your role permissions')
    const managerReq = { user: { id: 'm1', role: 'manager', active: true }, payload: {} }
    await expect(
      enforceUserMutation({
        operation: 'update',
        data: { role: 'owner' },
        originalDoc: { id: 's2', role: 'staff' },
        req: managerReq,
      } as never),
    ).rejects.toThrow('outside your role permissions')
    await expect(
      enforceUserMutation({
        operation: 'update',
        data: { active: false },
        originalDoc: { id: 'm1', role: 'manager' },
        req: managerReq,
      } as never),
    ).rejects.toThrow('outside your role permissions')
  })

  it('hides staff-only user fields from direct collection reads', async () => {
    const req = {
      user: { id: 's1', role: 'staff', active: true },
      payload: { find: () => Promise.resolve({ docs: [] }) },
    }
    await expect(userFieldRead('name')({ req } as never)).resolves.toBe(true)
    await expect(userFieldRead('role')({ req } as never)).resolves.toBe(true)
    await expect(userFieldRead('active')({ req } as never)).resolves.toBe(false)
    await expect(userFieldRead('groups')({ req } as never)).resolves.toBe(false)
    await expect(userFieldRead('reportsTo')({ req } as never)).resolves.toBe(false)
  })

  it('serializes concurrent last-owner checks on one Payload instance', async () => {
    let countCalls = 0
    const payload = {
      count: () => {
        countCalls += 1
        return Promise.resolve({ totalDocs: 2 })
      },
    }
    const firstReq = { payload }
    const secondReq = { payload }
    await protectLastActiveOwner({
      data: { active: false },
      originalDoc: { id: 'o1', role: 'owner', active: true },
      req: firstReq,
    } as never)
    const second = protectLastActiveOwner({
      data: { active: false },
      originalDoc: { id: 'o2', role: 'owner', active: true },
      req: secondReq,
    } as never)
    await Promise.resolve()
    expect(countCalls).toBe(1)
    authHooks.afterOperation[0]({ req: firstReq } as never)
    await second
    expect(countCalls).toBe(2)
    authHooks.afterOperation[0]({ req: secondReq } as never)
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
