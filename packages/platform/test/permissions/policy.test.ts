import { asId } from '@ops/kernel'
import { describe, expect, it } from 'vitest'
import type { AccessResource, Action, Actor, Role } from '../../src/contracts/access'
import { can, inScope } from '../../src/permissions/policy'

function actor(role: Role, overrides: Partial<Actor> = {}): Actor {
  return { id: asId(`${role}-1`), role, groupIds: [asId('group-a')], reportIds: [], active: true, ...overrides }
}

const foreign: AccessResource = { type: 'item', ownerId: asId('someone-else') }
const owned: AccessResource = { type: 'item', ownerId: asId('staff-1') }

describe('can', () => {
  it.each<[Role, Action, boolean]>([
    ['owner', 'read', true],
    ['manager', 'update', true],
    ['staff', 'read', false],
    ['staff', 'update', false],
    ['staff', 'assign', false],
    ['staff', 'convert', false],
    ['staff', 'create', true],
    ['staff', 'delete', false],
    ['manager', 'delete', true],
    ['manager', 'manage_settings', false],
    ['owner', 'manage_settings', true],
    ['manager', 'manage_workflows', true],
    ['staff', 'manage_workflows', false],
    ['manager', 'admin_panel', true],
    ['staff', 'admin_panel', false],
    ['staff', 'manage_intake', false],
  ])('%s %s on a record outside staff scope → %s', (role, action, expected) => {
    expect(can(actor(role), action, foreign)).toBe(expected)
  })

  it('lets staff read, update, assign and convert records in scope but never delete them', () => {
    const staff = actor('staff')
    expect(['read', 'update', 'assign', 'convert'].every((action) => can(staff, action as Action, owned))).toBe(true)
    expect(can(staff, 'delete', owned)).toBe(false)
  })

  it('limits managers to managing staff members while owners manage every role', () => {
    const member = (role: Role): AccessResource => ({ type: 'user', role })
    expect(can(actor('manager'), 'manage_members', member('staff'))).toBe(true)
    expect(can(actor('manager'), 'manage_members', member('manager'))).toBe(false)
    expect(can(actor('owner'), 'manage_members', member('owner'))).toBe(true)
    expect(can(actor('staff'), 'manage_members', member('staff'))).toBe(false)
  })

  it('denies inactive actors everything', () => {
    const inactive = actor('owner', { active: false })
    expect(can(inactive, 'read', foreign)).toBe(false)
    expect(can(inactive, 'create', { type: 'item' })).toBe(false)
  })
})

describe('inScope', () => {
  const staff = actor('staff', { reportIds: [asId('report-1')] })

  it('includes records owned by the actor or a transitive report', () => {
    expect(inScope(staff, owned)).toBe(true)
    expect(inScope(staff, { type: 'item', ownerId: asId('report-1') })).toBe(true)
  })

  it('includes records assigned to the actor or in the actor group', () => {
    expect(inScope(staff, { type: 'item', assigneeIds: [asId('x'), asId('staff-1')] })).toBe(true)
    expect(inScope(staff, { type: 'item', groupId: asId('group-a') })).toBe(true)
  })

  it('excludes peers records', () => {
    expect(inScope(staff, { type: 'item', ownerId: asId('peer'), groupId: asId('group-b') })).toBe(false)
  })
})
