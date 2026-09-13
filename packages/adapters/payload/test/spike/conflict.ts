import { asId, systemClock, type Id } from '@ops/kernel'
import type { TaskRecord, TaskRepository } from '@ops/module-work'
import { can, changeStage, type ChangeStageDeps, type RecordRef } from '@ops/platform'
import type { Payload } from 'payload'
import { expect } from 'vitest'
import { resolveActor } from '../../src/access/actor'
import { isTerminalCategory } from '../../src/collections/workflow-rules'
import { COLLECTIONS, RECORD_TYPES } from '../../src/contracts/names'
import { createTaskRepository } from '../../src/repositories'
import { createUnitOfWork } from '../../src/uow/unit-of-work'
import { requestAs, SEEDED_EMAILS, type LocalStack, type SpikeCase } from './local-stack'

const DAY_MS = 86_400_000
const TASK_TITLE = 'Plan launch checklist'
const RACE_TITLE = 'Schedule kickoff meeting'

interface OwnerWork {
  readonly deps: ChangeStageDeps
  readonly tasks: TaskRepository
}

interface StoredState {
  readonly task: unknown
  readonly activity: number
}

async function ownerWork(payload: Payload): Promise<OwnerWork> {
  const req = await requestAs(payload, SEEDED_EMAILS.owner)
  const actor = await resolveActor(req)
  if (actor === undefined) throw new Error('owner actor missing')
  const tasks = createTaskRepository(req)
  return { tasks, deps: { actor, can, store: tasks, uow: createUnitOfWork(req), clock: systemClock } }
}

async function taskByTitle(tasks: TaskRepository, title: string): Promise<TaskRecord> {
  const task = (await tasks.listTasks()).find((candidate) => candidate.title === title)
  if (task === undefined) throw new Error(`no task ${title}`)
  return task
}

// Everything a stage or date change writes: the task row and the task's activity entries.
async function storedState(payload: Payload, id: Id): Promise<StoredState> {
  const where = { id: { equals: id } }
  const { docs } = await payload.find({
    collection: COLLECTIONS.tasks,
    where,
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const activity = await payload.count({
    collection: COLLECTIONS.activity,
    where: { recordId: { equals: id } },
    overrideAccess: true,
  })
  return { task: docs[0], activity: activity.totalDocs }
}

async function openStagesBesides(tasks: TaskRepository, stageId: Id): Promise<Id[]> {
  const { stages } = await tasks.loadTaskWorkflow()
  return stages.filter((stage) => stage.id !== stageId && !isTerminalCategory(stage.category)).map((stage) => stage.id)
}

async function expectStaleStageChangeRejected(payload: Payload): Promise<void> {
  const { deps, tasks } = await ownerWork(payload)
  const task = await taskByTitle(tasks, TASK_TITLE)
  const [first, second] = await openStagesBesides(tasks, task.stageId)
  if (first === undefined || second === undefined) throw new Error('the task workflow needs three open stages')
  const record: RecordRef = { type: RECORD_TYPES.tasks, id: asId(task.id) }
  const before = await storedState(payload, record.id)
  expect(await changeStage(deps, { record, toStageId: first, expectedUpdatedAt: task.updatedAt })).toMatchObject({
    ok: true,
  })
  const afterMove = await storedState(payload, record.id)
  expect(afterMove.activity).toBe(before.activity + 1)
  // A second tab still holds the version from before the move.
  const stale = await changeStage(deps, { record, toStageId: second, expectedUpdatedAt: task.updatedAt })
  expect(stale).toMatchObject({ ok: false, error: { code: 'CONFLICT' } })
  expect(await storedState(payload, record.id)).toEqual(afterMove)
}

// Calls the store directly, past the version check in changeStage, so only the database guard can refuse the write.
async function expectStaleSaveStageRefused(payload: Payload): Promise<void> {
  const { tasks } = await ownerWork(payload)
  const task = await taskByTitle(tasks, TASK_TITLE)
  const [other] = await openStagesBesides(tasks, task.stageId)
  if (other === undefined) throw new Error('the task workflow needs a second open stage')
  const ref: RecordRef = { type: RECORD_TYPES.tasks, id: asId(task.id) }
  const before = await storedState(payload, ref.id)
  const stale = { ref, stageId: other, stageEnteredAt: Date.now(), expectedUpdatedAt: task.updatedAt - 1 }
  expect(await tasks.saveStage(stale)).toBeUndefined()
  expect(await storedState(payload, ref.id)).toEqual(before)
}

async function expectStaleDatesRefused(stack: LocalStack): Promise<void> {
  const { tasks } = await ownerWork(stack.payload)
  const task = await taskByTitle(tasks, TASK_TITLE)
  const id = asId(task.id)
  // Far outside the cron windows of the duplicate tests.
  const dates = { startAt: stack.now + 90 * DAY_MS, dueAt: stack.now + 91 * DAY_MS }
  const before = await storedState(stack.payload, id)
  expect(await tasks.saveDates({ id, ...dates, expectedUpdatedAt: task.updatedAt - 1 })).toBeUndefined()
  expect(await storedState(stack.payload, id)).toEqual(before)
  expect(await tasks.saveDates({ id, ...dates, expectedUpdatedAt: task.updatedAt })).toMatchObject(dates)
}

async function expectOneConcurrentWriteWins(stack: LocalStack): Promise<void> {
  const { tasks } = await ownerWork(stack.payload)
  const task = await taskByTitle(tasks, RACE_TITLE)
  const write = (days: number) => {
    const at = stack.now + days * DAY_MS
    return tasks.saveDates({ id: asId(task.id), startAt: at, dueAt: at, expectedUpdatedAt: task.updatedAt })
  }
  const results = await Promise.all([write(120), write(121)])
  expect(results.filter((result) => result !== undefined)).toHaveLength(1)
}

/** Compare-and-set behavior of `changeStage` and the Payload task repository on local D1. */
export const CONFLICT_CASES: readonly SpikeCase[] = [
  [
    'changeStage with a stale expectedUpdatedAt returns CONFLICT and writes nothing',
    (s) => expectStaleStageChangeRejected(s.payload),
  ],
  [
    'saveStage with a stale expectedUpdatedAt is refused by the database guard',
    (s) => expectStaleSaveStageRefused(s.payload),
  ],
  ['saveDates with a stale expectedUpdatedAt returns undefined and writes nothing', expectStaleDatesRefused],
  ['two concurrent saveDates with the same expectedUpdatedAt: exactly one succeeds', expectOneConcurrentWriteWins],
]
