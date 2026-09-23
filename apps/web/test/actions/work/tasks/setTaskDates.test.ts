import { asId, type Id } from '@ops/kernel'
import { can, type Actor } from '@ops/platform'
import { expect, it } from 'vitest'
import { runSetTaskDates } from '../../../../src/server/work/set-task-dates'
import type { TaskRecord, TaskRepository, WorkDeps } from '../../../../src/server/work/task-repository'

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.UTC(2026, 8, 14)
const TASK_ID = asId('task-1')
const OWNER: Actor = { id: asId('owner-1'), role: 'owner', groupIds: [], reportIds: [], active: true }
const STAFF: Actor = { id: asId('staff-1'), role: 'staff', groupIds: [], reportIds: [], active: true }

function task(assigneeIds: readonly Id[] = []): TaskRecord {
  const stage = { workflowId: asId('workflow-1'), stageId: asId('stage-1'), stageEnteredAt: NOW }
  return {
    id: TASK_ID,
    title: 'Draft brief',
    priority: 'none',
    updatedAt: NOW,
    assigneeIds,
    ...stage,
    startAt: NOW,
    dueAt: NOW + DAY,
    projectId: null,
    relatedType: null,
    relatedId: null,
  }
}

function repository(seed: readonly TaskRecord[]): TaskRepository {
  const rows = new Map(seed.map((row) => [row.id, row]))
  return {
    loadTaskWorkflow: () => Promise.reject(new Error('not used')),
    listTasks: () => Promise.resolve([...rows.values()]),
    loadRecord: (ref) => {
      const row = rows.get(ref.id)
      return Promise.resolve(row && { ref, ...row })
    },
    loadWorkflow: () => Promise.resolve(undefined),
    saveStage: () => Promise.resolve(undefined),
    addTransition: () => Promise.resolve(),
    addActivity: () => Promise.resolve(),
    saveDates: ({ id, startAt, dueAt, expectedUpdatedAt }) => {
      const row = rows.get(id)
      if (row?.updatedAt !== expectedUpdatedAt) return Promise.resolve(undefined)
      const saved = { ...row, startAt, dueAt, updatedAt: row.updatedAt + 1 }
      rows.set(id, saved)
      return Promise.resolve(saved)
    },
  }
}

function workDeps(actor: Actor, seed: readonly TaskRecord[] = [task()]): WorkDeps {
  return { actor, can, tasks: repository(seed), uow: { run: (work) => work() }, clock: { now: () => NOW } }
}

const move = { taskId: TASK_ID, startAt: NOW + DAY, dueAt: NOW + 3 * DAY, expectedUpdatedAt: NOW }

async function datesOf(deps: WorkDeps): Promise<readonly (number | null)[]> {
  return (await deps.tasks.listTasks()).flatMap((row) => [row.startAt, row.dueAt])
}

it('saves the new dates and returns the new version', async () => {
  const deps = workDeps(OWNER)
  const result = await runSetTaskDates(deps, move)
  expect(result).toEqual({ ok: true, data: { startAt: NOW + DAY, dueAt: NOW + 3 * DAY, updatedAt: NOW + 1 } })
  expect(await datesOf(deps)).toEqual([NOW + DAY, NOW + 3 * DAY])
})

it('accepts cleared dates', async () => {
  const result = await runSetTaskDates(workDeps(OWNER), { ...move, startAt: null })
  expect(result).toMatchObject({ ok: true, data: { startAt: null, dueAt: NOW + 3 * DAY } })
})

it('rejects a start after the due date with VALIDATION and keeps the dates', async () => {
  const deps = workDeps(OWNER)
  const result = await runSetTaskDates(deps, { ...move, startAt: NOW + 4 * DAY })
  expect(result).toMatchObject({ ok: false, error: { code: 'VALIDATION' } })
  expect(await datesOf(deps)).toEqual([NOW, NOW + DAY])
})

it.each([
  ['an empty task id', { ...move, taskId: ' ' }],
  ['a non-finite date', { ...move, dueAt: Number.NaN }],
  ['a missing version', { taskId: TASK_ID, startAt: null, dueAt: null }],
  ['a non-object input', 'task-1'],
])('rejects %s with VALIDATION', async (_label, input) => {
  expect(await runSetTaskDates(workDeps(OWNER), input)).toMatchObject({ ok: false, error: { code: 'VALIDATION' } })
})

it('forbids staff outside the task scope', async () => {
  const deps = workDeps(STAFF)
  const result = await runSetTaskDates(deps, move)
  expect(result).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } })
  expect(await datesOf(deps)).toEqual([NOW, NOW + DAY])
})

it('lets assigned staff change the dates', async () => {
  const result = await runSetTaskDates(workDeps(STAFF, [task([STAFF.id])]), move)
  expect(result.ok).toBe(true)
})

it('returns NOT_FOUND for a missing task', async () => {
  const result = await runSetTaskDates(workDeps(OWNER, []), move)
  expect(result).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } })
})

it('returns CONFLICT for a stale expectedUpdatedAt', async () => {
  const deps = workDeps(OWNER)
  const result = await runSetTaskDates(deps, { ...move, expectedUpdatedAt: NOW - 1 })
  expect(result).toMatchObject({ ok: false, error: { code: 'CONFLICT' } })
  expect(await datesOf(deps)).toEqual([NOW, NOW + DAY])
})
