import { asId } from '@ops/kernel'
import { describe, expect, it } from 'vitest'
import type { Actor, Role } from '../../src/contracts/access'
import { createScopeFilter, MATCH_NOTHING } from '../../src/permissions/scope'

function actor(role: Role, overrides: Partial<Actor> = {}): Actor {
  return { id: asId('user-1'), role, groupIds: [], reportIds: [], active: true, ...overrides }
}

const scopeFilter = createScopeFilter({
  item: { ownerField: 'owner', assigneesField: 'assignees', groupField: 'group' },
  container: {
    ownerField: 'owner',
    extensions: [(current) => ({ field: 'members', op: 'in', value: [current.id] })],
  },
})

describe('createScopeFilter', () => {
  it('leaves owners and managers unrestricted', () => {
    expect(scopeFilter(actor('owner'), 'item')).toBeUndefined()
    expect(scopeFilter(actor('manager'), 'unknown')).toBeUndefined()
  })

  it('ORs owner (with transitive reports), assignee and group branches for staff', () => {
    const staff = actor('staff', { reportIds: [asId('report-1')], groupIds: [asId('group-a')] })
    expect(scopeFilter(staff, 'item')).toEqual({
      or: [
        { field: 'owner', op: 'in', value: ['user-1', 'report-1'] },
        { field: 'assignees', op: 'in', value: ['user-1'] },
        { field: 'group', op: 'in', value: ['group-a'] },
      ],
    })
  })

  it('omits the group branch for staff without groups and appends extensions', () => {
    expect(scopeFilter(actor('staff'), 'item')).toEqual({
      or: [
        { field: 'owner', op: 'in', value: ['user-1'] },
        { field: 'assignees', op: 'in', value: ['user-1'] },
      ],
    })
    expect(scopeFilter(actor('staff'), 'container')).toEqual({
      or: [
        { field: 'owner', op: 'in', value: ['user-1'] },
        { field: 'members', op: 'in', value: ['user-1'] },
      ],
    })
  })

  it('matches nothing for inactive actors and unregistered record types', () => {
    expect(scopeFilter(actor('owner', { active: false }), 'item')).toBe(MATCH_NOTHING)
    expect(scopeFilter(actor('staff'), 'unknown')).toBe(MATCH_NOTHING)
  })
})
