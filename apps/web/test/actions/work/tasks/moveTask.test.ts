import { asId, fixedClock, type Id } from '@ops/kernel'
import { can, type StageStore, type StageTrackedRecord, type Workflow } from '@ops/platform'
import { describe, expect, it } from 'vitest'
import { runMoveTask } from '../../../../src/server/actions/work/tasks/moveTask'
import type { TaskRecord, TaskRepository, WorkDeps } from '../../../../src/server/work/task-repository'

const TASK_ID = asId('task-1')

const workflow: Workflow = {
  id: asId('workflow-task'),
  recordType: 'task',
  name: 'Tasks',
  defaultStageId: asId('todo'),
  stages: [
    { id: asId('todo'), name: 'To do', category: 'open', color: 'blue', position: 0 },
    { id: asId('done'), name: 'Done', category: 'done_success', color: 'green', position: 1 },
  ],
}

const seed: TaskRecord = {
  id: TASK_ID,
  title: 'Send invoice',
  workflowId: workflow.id,
  stageId: asId('todo'),
  stageEnteredAt: 1_000,
  updatedAt: 5_000,
  priority: 'medium',
  assigneeIds: [],
  startAt: null,
  dueAt: null,
}

function toRecord(task: TaskRecord): StageTrackedRecord {
  const { id, workflowId, stageId, stageEnteredAt, updatedAt, assigneeIds } = task
  return { ref: { type: 'task', id }, workflowId, stageId, stageEnteredAt, updatedAt, assigneeIds }
}

function saveStage(tasks: Map<Id, TaskRecord>): StageStore['saveStage'] {
  return ({ ref, stageId, stageEnteredAt, expectedUpdatedAt }) => {
    const task = tasks.get(ref.id)
    if (task?.updatedAt !== expectedUpdatedAt) return Promise.resolve(undefined)
    const saved = { ...task, stageId, stageEnteredAt, updatedAt: task.updatedAt + 1 }
    tasks.set(task.id, saved)
    return Promise.resolve(toRecord(saved))
  }
}

function createRepository(): TaskRepository {
  const tasks = new Map([[TASK_ID, seed]])
  return {
    loadTaskWorkflow: () => Promise.resolve(workflow),
    listTasks: () => Promise.resolve([...tasks.values()]),
    loadRecord: (ref) => {
      const task = tasks.get(ref.id)
      return Promise.resolve(task && toRecord(task))
    },
    loadWorkflow: (id) => Promise.resolve(id === workflow.id ? workflow : undefined),
    saveStage: saveStage(tasks),
    addTransition: () => Promise.resolve(),
    addActivity: () => Promise.resolve(),
    saveDates: () => Promise.resolve(undefined),
  }
}

function createDeps(): WorkDeps {
  return {
    actor: { id: asId('owner-1'), role: 'owner', groupIds: [], reportIds: [], active: true },
    can,
    tasks: createRepository(),
    uow: { run: (work) => work() },
    clock: fixedClock(9_000),
  }
}

async function stageOf(deps: WorkDeps): Promise<string | undefined> {
  const tasks = await deps.tasks.listTasks()
  return tasks.find((task) => task.id === TASK_ID)?.stageId
}

describe('runMoveTask', () => {
  it('moves the task and returns the saved stage and version', async () => {
    const deps = createDeps()
    const result = await runMoveTask(deps, { taskId: 'task-1', toStageId: 'done', expectedUpdatedAt: 5_000 })
    expect(result).toEqual({ ok: true, data: { stageId: 'done', updatedAt: 5_001 } })
    expect(await stageOf(deps)).toBe('done')
  })

  it('returns CONFLICT for a stale expectedUpdatedAt and leaves the task unchanged', async () => {
    const deps = createDeps()
    const result = await runMoveTask(deps, { taskId: 'task-1', toStageId: 'done', expectedUpdatedAt: 4_999 })
    expect(result).toMatchObject({ ok: false, error: { code: 'CONFLICT' } })
    expect(await stageOf(deps)).toBe('todo')
  })

  it('returns CONFLICT when the version was already used by an earlier move', async () => {
    const deps = createDeps()
    await runMoveTask(deps, { taskId: 'task-1', toStageId: 'done', expectedUpdatedAt: 5_000 })
    const again = await runMoveTask(deps, { taskId: 'task-1', toStageId: 'todo', expectedUpdatedAt: 5_000 })
    expect(again).toMatchObject({ ok: false, error: { code: 'CONFLICT' } })
  })

  it('returns VALIDATION for a stage outside the workflow', async () => {
    const deps = createDeps()
    const result = await runMoveTask(deps, { taskId: 'task-1', toStageId: 'archived', expectedUpdatedAt: 5_000 })
    expect(result).toMatchObject({ ok: false, error: { code: 'VALIDATION' } })
    expect(await stageOf(deps)).toBe('todo')
  })

  it.each([
    ['null', null],
    ['empty task id', { taskId: '', toStageId: 'done', expectedUpdatedAt: 5_000 }],
    ['blank stage id', { taskId: 'task-1', toStageId: '  ', expectedUpdatedAt: 5_000 }],
    ['string version', { taskId: 'task-1', toStageId: 'done', expectedUpdatedAt: '5000' }],
    ['NaN version', { taskId: 'task-1', toStageId: 'done', expectedUpdatedAt: Number.NaN }],
  ])('returns VALIDATION for invalid input (%s)', async (_name, input) => {
    const deps = createDeps()
    expect(await runMoveTask(deps, input)).toMatchObject({ ok: false, error: { code: 'VALIDATION' } })
    expect(await stageOf(deps)).toBe('todo')
  })
})
