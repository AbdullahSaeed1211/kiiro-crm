/* eslint-disable */
import { asId, type Clock } from '@ops/kernel'
import { createProject, createTask, moveTask, updateTask } from '../src'
import type { ProjectRecord, WorkDeps, WorkRepository } from '../src'
import type { Actor, Workflow } from '@ops/platform'
import { describe, expect, it } from 'vitest'
import { hasOpenChildren, myTasksBuckets, orderByRank, rankBetween, rebalanceRanks, subtaskDepth } from '../src'
import type { WorkTaskRecord } from '../src'

const task = (id: string, extra: Partial<WorkTaskRecord> = {}): WorkTaskRecord => ({
  id: asId(id),
  title: id,
  description: null,
  projectId: null,
  relatedType: null,
  relatedId: null,
  parentTaskId: null,
  workflowId: asId('workflow'),
  stageId: asId('open'),
  stageEnteredAt: 0,
  rank: id,
  priority: 'none',
  assigneeIds: [asId('staff')],
  groupId: null,
  startAt: null,
  dueAt: null,
  completedAt: null,
  stageCategory: 'open',
  createdAt: 0,
  updatedAt: 1,
  ...extra,
})

describe('work calendar and hierarchy invariants', () => {
  it('T-WORK-1 buckets by tenant calendar day across a DST boundary', () => {
    const now = Date.parse('2026-11-01T05:30:00.000Z')
    const result = myTasksBuckets({
      tasks: [
        task('today', { dueAt: now + 30 * 60_000 }),
        task('next', { dueAt: Date.parse('2026-11-02T05:00:00.000Z') }),
      ],
      actor: { id: asId('staff') },
      timeZone: 'America/New_York',
      now,
    })
    expect(result.today.map((value) => value.id)).toEqual(['today'])
    expect(result.next7Days.map((value) => value.id)).toEqual(['next'])
  })

  it('T-WORK-2 reports two levels of ancestry and rejects open children for a terminal parent', () => {
    const root = task('root')
    const child = task('child', { parentTaskId: root.id })
    const grandchild = task('grandchild', { parentTaskId: child.id })
    const records = new Map([
      [root.id, root],
      [child.id, child],
      [grandchild.id, grandchild],
    ])
    expect(subtaskDepth(grandchild, records)).toBe(2)
    expect(hasOpenChildren([child])).toBe(true)
    expect(hasOpenChildren([task('done-child', { completedAt: 1, stageCategory: 'done_success' })])).toBe(false)
  })
})

describe('work ordering and assignment invariants', () => {
  it('T-WORK-3 keeps rank moves deterministic and supports rebalancing', () => {
    expect(rankBetween('a', 'c')).toBe('b')
    expect(orderByRank([task('b', { rank: '2' }), task('a', { rank: '1' })]).map((value) => value.id)).toEqual([
      'a',
      'b',
    ])
    expect([...rebalanceRanks(['a', 'b']).values()]).toEqual(['000000000001', '000000000002'])
  })

  it('T-WORK-4 excludes completed tasks and tasks assigned to another staff member', () => {
    const now = Date.parse('2026-09-14T12:00:00.000Z')
    const result = myTasksBuckets({
      tasks: [
        task('open', { dueAt: now }),
        task('closed', { dueAt: now, completedAt: now, stageCategory: 'done_success' }),
        task('other', { dueAt: now, assigneeIds: [asId('other')] }),
      ],
      actor: { id: asId('staff') },
      timeZone: 'UTC',
      now,
    })
    expect(result.today.map((value) => value.id)).toEqual(['open'])
  })
})

const actor = (role: Actor['role'], id = 'staff'): Actor => ({
  id: asId(id),
  role,
  active: true,
  groupIds: [asId('group')],
  reportIds: [],
})
const workflow: Workflow = {
  id: asId('workflow'),
  recordType: 'task',
  name: 'Tasks',
  defaultStageId: asId('open'),
  stages: [
    { id: asId('open'), name: 'Open', category: 'open', color: 'blue', position: 0 },
    { id: asId('done'), name: 'Done', category: 'done_success', color: 'green', position: 1 },
  ],
}
const project = (id = 'project'): ProjectRecord => ({
  id: asId(id),
  name: id,
  organizationId: null,
  ownerId: asId('manager'),
  memberIds: [asId('staff')],
  workflowId: asId('workflow'),
  stageId: asId('open'),
  stageCategory: 'open',
  stageEnteredAt: 0,
  startAt: null,
  targetEndAt: null,
  description: null,
  createdAt: 0,
  updatedAt: 1,
})
function depsFor(input: Partial<WorkDeps> = {}): WorkDeps {
  const repository = {
    getProject: async () => project(),
    loadDefaultWorkflow: async () => workflow,
    loadWorkflow: async () => workflow,
    getTask: async () => undefined,
    listTasks: async () => [],
    listChildren: async () => [],
    createTask: async () => task('created'),
    createProject: async () => project(),
    updateTask: async () => undefined,
    saveTaskMove: async () => undefined,
  } as unknown as WorkRepository
  const clock: Clock = { now: () => 10 }
  return {
    actor: actor('staff'),
    can: () => true,
    repo: repository,
    uow: { run: async <T>(work: () => Promise<T>) => work() },
    clock,
    ...input,
  }
}

describe('work commands enforce authorization and compare-and-set writes', () => {
  it('applies the owner/manager/staff assignment matrix on create', async () => {
    const staff = depsFor()
    const staffResult = await createTask(staff, { title: 'outside assignment', assigneeIds: [asId('other')] })
    expect(staffResult.ok).toBe(false)
    const manager = depsFor({ actor: actor('manager', 'manager') })
    const managerResult = await createTask(manager, { title: 'managed assignment', assigneeIds: [asId('other')] })
    expect(managerResult.ok).toBe(true)
    const owner = depsFor({ actor: actor('owner', 'owner') })
    const projectResult = await createProject(owner, {
      name: 'owned project',
      ownerId: asId('other'),
      memberIds: [asId('other')],
    })
    expect(projectResult.ok).toBe(true)
  })

  it('rejects protected task patches and stale same-stage updates before writing', async () => {
    const current = task('current', { updatedAt: 5 })
    let writes = 0
    const deps = depsFor({
      repo: {
        ...depsFor().repo,
        getTask: async () => current,
        updateTask: async () => {
          writes += 1
          return current
        },
      } as WorkRepository,
    })
    expect(
      (await updateTask(deps, { taskId: current.id, expectedUpdatedAt: 5, patch: { stageId: asId('done') } })).ok,
    ).toBe(false)
    expect((await updateTask(deps, { taskId: current.id, expectedUpdatedAt: 4, patch: { title: 'stale' } })).ok).toBe(
      false,
    )
    expect(writes).toBe(0)
  })

  it('uses the atomic move port and rejects stale moves', async () => {
    const current = task('moving', { updatedAt: 5 })
    let atomicWrites = 0
    const deps = depsFor({
      repo: {
        ...depsFor().repo,
        getTask: async () => current,
        saveTaskMove: async () => {
          atomicWrites += 1
          return current
        },
      } as WorkRepository,
    })
    expect((await moveTask(deps, { taskId: current.id, toStageId: asId('done'), expectedUpdatedAt: 5 })).ok).toBe(true)
    expect(atomicWrites).toBe(1)
    expect((await moveTask(deps, { taskId: current.id, toStageId: asId('done'), expectedUpdatedAt: 4 })).ok).toBe(false)
    expect(atomicWrites).toBe(1)
  })
})
