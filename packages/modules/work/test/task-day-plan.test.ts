import { asId } from '@ops/kernel'
import { expect, it } from 'vitest'
import { addTaskToTodayPlan, removeTaskFromTodayPlan } from '../src'
import type { WorkRepository } from '../src'
import { actor, createMemoryRepo, depsFor, task } from './memory-work'

const SHARED_TASK_ID = 'shared-task'

it('adds an existing assigned task for the workspace calendar day without changing its deadline', async () => {
  const assigned = task('assigned-task', { assigneeIds: [asId('staff'), asId('manager')], dueAt: 1_790_000_000_000 })
  const entries: Parameters<WorkRepository['addTaskToDayPlan']>[0][] = []
  const repo = {
    ...createMemoryRepo(),
    getTask: () => Promise.resolve(assigned),
    addTaskToDayPlan: (entry: Parameters<WorkRepository['addTaskToDayPlan']>[0]) => {
      entries.push(entry)
      return Promise.resolve()
    },
  } as WorkRepository
  const deps = depsFor({ clock: { now: () => Date.parse('2026-03-08T04:30:00.000Z') }, repo })
  const result = await addTaskToTodayPlan(deps, { taskId: 'assigned-task' }, 'America/New_York')
  expect(result.ok).toBe(true)
  expect(entries).toEqual([
    { taskId: asId('assigned-task'), userId: asId('staff'), day: Date.parse('2026-03-07T00:00:00.000Z') },
  ])
  expect(assigned.dueAt).toBe(1_790_000_000_000)
  expect(assigned.assigneeIds).toEqual([asId('staff'), asId('manager')])
})

it("keeps one user's plan separate from another assignee", async () => {
  const assigned = task(SHARED_TASK_ID, { assigneeIds: [asId('manager'), asId('staff')] })
  const entries: Parameters<WorkRepository['addTaskToDayPlan']>[0][] = []
  const repo = {
    ...createMemoryRepo(),
    getTask: () => Promise.resolve(assigned),
    addTaskToDayPlan: (entry: Parameters<WorkRepository['addTaskToDayPlan']>[0]) => {
      entries.push(entry)
      return Promise.resolve()
    },
  } as WorkRepository
  const deps = depsFor({ actor: actor('manager', 'manager'), repo, clock: { now: () => 1_800_000_000_000 } })
  const result = await addTaskToTodayPlan(deps, { taskId: SHARED_TASK_ID }, 'UTC')
  expect(result.ok).toBe(true)
  expect(entries[0]?.userId).toBe(asId('manager'))

  const otherAssignee = await addTaskToTodayPlan(
    depsFor({ actor: actor('staff'), repo }),
    { taskId: SHARED_TASK_ID },
    'UTC',
  )
  expect(otherAssignee.ok).toBe(true)
  expect(entries.map((entry) => entry.userId)).toEqual([asId('manager'), asId('staff')])
})

it('rejects non-assignees and returns not found for missing tasks', async () => {
  const repo = {
    ...createMemoryRepo(),
    getTask: () => Promise.resolve(task(SHARED_TASK_ID, { assigneeIds: [asId('manager')] })),
  }
  const denied = await addTaskToTodayPlan(depsFor({ actor: actor('staff'), repo }), { taskId: SHARED_TASK_ID }, 'UTC')
  expect(denied.ok).toBe(false)
  const missing = await addTaskToTodayPlan(
    depsFor({ repo: { ...repo, getTask: () => Promise.resolve(undefined) } }),
    { taskId: 'missing' },
    'UTC',
  )
  expect(!missing.ok && missing.error.code).toBe('NOT_FOUND')
})

it('removes only the actor’s plan entry for today', async () => {
  const removed: Parameters<WorkRepository['removeTaskFromDayPlan']>[0][] = []
  const repo = {
    ...createMemoryRepo(),
    removeTaskFromDayPlan: (entry: Parameters<WorkRepository['removeTaskFromDayPlan']>[0]) => {
      removed.push(entry)
      return Promise.resolve()
    },
  }
  const deadline = 1_700_000_000_000
  const before = task('existing', { dueAt: deadline, assigneeIds: [asId('staff'), asId('manager')] })
  const result = await removeTaskFromTodayPlan(
    depsFor({ repo, clock: { now: () => Date.parse('2026-10-30T12:00:00.000Z') } }),
    { taskId: 'existing' },
    'Asia/Kolkata',
  )
  expect(result.ok).toBe(true)
  expect(removed).toEqual([
    { taskId: asId('existing'), userId: asId('staff'), day: Date.parse('2026-10-30T00:00:00.000Z') },
  ])
  expect(before.dueAt).toBe(deadline)
  expect(before.assigneeIds).toEqual([asId('staff'), asId('manager')])
})
