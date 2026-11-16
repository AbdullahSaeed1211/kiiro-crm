import { asId } from '@ops/kernel'
import { describe, expect, it } from 'vitest'
import type { Actor } from '../../src/contracts/access'
import { can } from '../../src/permissions/policy'

const watcher: Actor = {
  id: asId('staff'),
  role: 'staff',
  active: true,
  groupIds: [],
  reportIds: [],
}

describe('task responsibility permissions', () => {
  it('lets watchers read without granting edits, while assigners retain work access', () => {
    const task = { type: 'task', watcherIds: [watcher.id] }
    expect(can(watcher, 'read', task)).toBe(true)
    expect(can(watcher, 'update', task)).toBe(false)
    expect(can(watcher, 'assign', task)).toBe(false)

    const assignedBy = { type: 'task', assignedById: watcher.id }
    expect(can(watcher, 'read', assignedBy)).toBe(true)
    expect(can(watcher, 'update', assignedBy)).toBe(true)
  })
})
