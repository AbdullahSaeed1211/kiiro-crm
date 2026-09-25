import { asId } from '@ops/kernel'
import { describe, expect, it } from 'vitest'
import { createProject, createTask, moveTask, updateTask } from '../src'
import type { ProjectDraft, WorkRepository, WorkTaskRecord } from '../src'
import { hasOpenChildren, myTasksBuckets, orderByRank, rankBetween, rebalanceRanks, subtaskDepth } from '../src'
import { actor, createMemoryRepo, depsFor, project, task } from './memory-work'
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
describe('createProject enforces authorization and compare-and-set writes', () => {
  it('passes accepted project context and details to the repository', async () => {
    let draft: ProjectDraft | undefined
    const customRepo: WorkRepository = {
      ...createMemoryRepo(),
      createProject: (input: ProjectDraft) => {
        draft = input
        return Promise.resolve(project())
      },
    }
    const deps = depsFor({
      actor: actor('owner', 'owner'),
      repo: customRepo,
    })
    const result = await createProject(deps, {
      name: '  Client launch  ',
      organizationId: 'client',
      description: '  Prepare the launch  ',
      startAt: 10,
      targetEndAt: 20,
    })
    expect(result.ok).toBe(true)
    expect(draft).toMatchObject({
      name: 'Client launch',
      organizationId: asId('client'),
      description: 'Prepare the launch',
      startAt: 10,
      targetEndAt: 20,
    })
  })
})
describe('createProject validates input before writing', () => {
  it.each([
    [{ name: 'Launch', budget: 5 }, 'project contains unsupported fields'],
    [{ name: 'Launch', ownerId: 7 }, 'ownerId is invalid'],
    [{ name: 'Launch', memberIds: ['staff', 3] }, 'memberIds is invalid'],
    [{ name: 'Launch', description: 'x'.repeat(20_001) }, 'project description is invalid'],
    [{ name: 'Launch', startAt: 20, targetEndAt: 10 }, 'startAt must not be after targetEndAt'],
  ])('rejects invalid project input %j before writing', async (input, message) => {
    const result = await createProject(depsFor({ actor: actor('owner', 'owner') }), input)
    expect(result).toMatchObject({ ok: false, error: { code: 'VALIDATION', message } })
  })
})
describe('createTask enforces authorization and assignment matrix', () => {
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
})
describe('updateTask rejects protected patches and stale updates', () => {
  it('rejects protected task patches and stale same-stage updates before writing', async () => {
    const current = task('current', { updatedAt: 5 })
    let writes = 0
    const customRepo: WorkRepository = {
      ...createMemoryRepo(),
      getTask: () => Promise.resolve(current),
      updateTask: () => {
        writes += 1
        return Promise.resolve(current)
      },
    }
    const deps = depsFor({
      repo: customRepo,
    })
    expect(
      (await updateTask(deps, { taskId: current.id, expectedUpdatedAt: 5, patch: { stageId: asId('done') } })).ok,
    ).toBe(false)
    expect((await updateTask(deps, { taskId: current.id, expectedUpdatedAt: 4, patch: { title: 'stale' } })).ok).toBe(
      false,
    )
    expect(writes).toBe(0)
  })
})
describe('updateTask allows manager cross-group edits', () => {
  it('allows a manager to edit task details outside their assignment group without changing assignment', async () => {
    const current = task('cross-group', { updatedAt: 5, groupId: asId('other-group') })
    const customRepo: WorkRepository = {
      ...createMemoryRepo(),
      getTask: () => Promise.resolve(current),
      updateTask: (_id: unknown, patch: Partial<WorkTaskRecord>) => Promise.resolve({ ...current, ...patch }),
    }
    const deps = depsFor({
      actor: actor('manager', 'manager'),
      repo: customRepo,
    })
    const result = await updateTask(deps, {
      taskId: current.id,
      expectedUpdatedAt: 5,
      patch: { description: 'Updated by manager' },
    })
    expect(result.ok).toBe(true)
  })
})

describe('moveTask uses atomic operations and rejects stale moves', () => {
  it('uses the atomic move port and rejects stale moves', async () => {
    const current = task('moving', { updatedAt: 5 })
    let atomicWrites = 0
    const customRepo: WorkRepository = {
      ...createMemoryRepo(),
      getTask: () => Promise.resolve(current),
      saveTaskMove: () => {
        atomicWrites += 1
        return Promise.resolve(current)
      },
    }
    const deps = depsFor({
      repo: customRepo,
    })
    expect((await moveTask(deps, { taskId: current.id, toStageId: asId('done'), expectedUpdatedAt: 5 })).ok).toBe(true)
    expect(atomicWrites).toBe(1)
    expect((await moveTask(deps, { taskId: current.id, toStageId: asId('done'), expectedUpdatedAt: 4 })).ok).toBe(false)
    expect(atomicWrites).toBe(1)
  })
})
