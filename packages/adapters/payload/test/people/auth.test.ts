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
import { peopleAccess, userFieldRead } from '../../src/collections/people/access'
import { invitationExpiresAt, invitationUsable } from '../../src/collections/people/invitations'

const EMAIL = 'person@example.test'
const ROLE_PERMISSION_ERROR = 'outside your role permissions'
const RESET_OPERATION = 'passwordReset'
const UNAUTH_UPDATE_DENIED = 'permission to update'

// The auth suite intentionally keeps boundary cases together.
// eslint-disable-next-line max-lines-per-function -- the fixture covers the complete auth hook matrix in one scenario.
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
    ).rejects.toThrow(ROLE_PERMISSION_ERROR)
    const managerReq = { user: { id: 'm1', role: 'manager', active: true }, payload: {} }
    await expect(
      enforceUserMutation({
        operation: 'update',
        data: { role: 'owner' },
        originalDoc: { id: 's2', role: 'staff' },
        req: managerReq,
      } as never),
    ).rejects.toThrow(ROLE_PERMISSION_ERROR)
    await expect(
      enforceUserMutation({
        operation: 'update',
        data: { active: false },
        originalDoc: { id: 'm1', role: 'manager' },
        req: managerReq,
      } as never),
    ).rejects.toThrow(ROLE_PERMISSION_ERROR)
  })

  // eslint-disable-next-line max-lines-per-function -- each denial checks a separate privilege escalation boundary.
  it('allows only server-context password reset token updates without an actor', async () => {
    const original = {
      id: 'u1',
      email: EMAIL,
      name: 'Member',
      role: 'owner',
      active: true,
      totpSecret: 'stored',
      apiTokens: [{ name: 'device', hash: 'stored-hash' }],
      resetPasswordToken: null,
      resetPasswordExpiration: null,
    }
    const resetFields = {
      resetPasswordToken: 'a'.repeat(40),
      resetPasswordExpiration: new Date(Date.now() + 60_000).toISOString(),
    }
    await expect(
      enforceUserMutation({
        operation: 'update',
        data: { ...original, ...resetFields },
        originalDoc: original,
        req: { user: null },
        context: { authOperation: RESET_OPERATION },
      } as never),
    ).resolves.toMatchObject({ role: 'owner', ...resetFields })
    await expect(
      enforceUserMutation({
        operation: 'update',
        data: { ...original, ...resetFields, role: 'staff' },
        originalDoc: original,
        req: { user: null },
        context: { authOperation: RESET_OPERATION },
      } as never),
    ).rejects.toThrow(UNAUTH_UPDATE_DENIED)
    await expect(
      enforceUserMutation({
        operation: 'update',
        data: { ...original, ...resetFields },
        originalDoc: original,
        req: { user: null },
        context: {},
      } as never),
    ).rejects.toThrow(UNAUTH_UPDATE_DENIED)
    await expect(
      enforceUserMutation({
        operation: 'update',
        data: { ...original, ...resetFields, resetPasswordToken: 'invalid' },
        originalDoc: original,
        req: { user: null },
        context: { authOperation: RESET_OPERATION },
      } as never),
    ).rejects.toThrow(UNAUTH_UPDATE_DENIED)
    await expect(
      enforceUserMutation({
        operation: 'update',
        data: { ...original, ...resetFields, totpSecret: 'modified' },
        originalDoc: original,
        req: { user: null },
        context: { authOperation: RESET_OPERATION },
      } as never),
    ).rejects.toThrow(UNAUTH_UPDATE_DENIED)
  })

  it('grants update access only to the trusted password reset context', async () => {
    await expect(peopleAccess.users.update({ req: { user: null, context: {} } } as never)).resolves.toBe(false)
    await expect(
      peopleAccess.users.update({ req: { user: null, context: { authOperation: RESET_OPERATION } } } as never),
    ).resolves.toBe(true)
  })

  it('lets a manager change a staff work profile without permitting role promotion', async () => {
    const managerReq = { user: { id: 'm1', role: 'manager', active: true }, payload: {} }
    await expect(
      enforceUserMutation({
        operation: 'update',
        data: { role: 'staff', workProfile: 'sales' },
        originalDoc: { id: 's2', role: 'staff', workProfile: 'delivery' },
        req: managerReq,
      } as never),
    ).resolves.toMatchObject({ workProfile: 'sales' })
    await expect(
      enforceUserMutation({
        operation: 'update',
        data: { role: 'manager', workProfile: 'sales' },
        originalDoc: { id: 's2', role: 'staff', workProfile: 'delivery' },
        req: managerReq,
      } as never),
    ).rejects.toThrow(ROLE_PERMISSION_ERROR)
  })

  it('hides staff-only user fields from direct collection reads', async () => {
    const req = {
      user: { id: 's1', role: 'staff', active: true },
      payload: { find: () => Promise.resolve({ docs: [] }) },
    }
    await expect(userFieldRead('name')({ req } as never)).resolves.toBe(true)
    await expect(userFieldRead('role')({ req } as never)).resolves.toBe(true)
    await expect(userFieldRead('active')({ req } as never)).resolves.toBe(false)
    await expect(userFieldRead('workProfile')({ req, id: 's1' } as never)).resolves.toBe(true)
    await expect(userFieldRead('workProfile')({ req, id: 's2' } as never)).resolves.toBe(false)
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
    await authHooks.afterOperation[0]({ req: firstReq } as never)
    await second
    expect(countCalls).toBe(2)
    await authHooks.afterOperation[0]({ req: secondReq } as never)
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
