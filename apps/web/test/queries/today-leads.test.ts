import { asId } from '@ops/kernel'
import type { Actor } from '@ops/platform'
import { authorizedTodayLeadPerson, todayLeadScope } from '../../src/server/queries/today-lead-scope'
import { describe, expect, it } from 'vitest'

function actor(role: Actor['role'], id: string): Actor {
  return { id: asId(id), role, active: true, groupIds: [], reportIds: [] }
}

describe('todayLeadScope', () => {
  it('keeps a staff URL tampering attempt inside the signed-in user scope', () => {
    const scope = todayLeadScope(actor('staff', 'staff-1'), true, 'other-person')
    expect(scope.team).toBe(false)
    expect(scope.ownership).toEqual({
      or: [{ owner: { equals: 'staff-1' } }, { assignees: { contains: 'staff-1' } }],
    })
  })

  it('limits a manager person view to that person’s owned or assigned leads', () => {
    const scope = todayLeadScope(actor('manager', 'manager-1'), true, 'report-1')
    expect(scope.team).toBe(true)
    expect(scope.ownership).toEqual({
      or: [{ owner: { equals: 'report-1' } }, { assignees: { contains: 'report-1' } }],
    })
  })

  it('clamps a manager follow-up URL to their reports and rejects arbitrary people', () => {
    const manager = { ...actor('manager', 'manager-1'), reportIds: [asId('report-1')] }
    expect(authorizedTodayLeadPerson(manager, 'report-1')).toBe('report-1')
    expect(authorizedTodayLeadPerson(manager, 'other-person')).toBeUndefined()
  })

  it('does not let staff widen a follow-up URL to another person or unassigned leads', () => {
    const staff = actor('staff', 'staff-1')
    expect(authorizedTodayLeadPerson(staff, 'other-person')).toBeUndefined()
    expect(authorizedTodayLeadPerson(staff, 'unassigned')).toBeUndefined()
    expect(authorizedTodayLeadPerson(staff, 'me')).toBe('staff-1')
  })
})
