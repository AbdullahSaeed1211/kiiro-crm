import { asId, type Id } from '@ops/kernel'
import type { StageTrackedRecord, Workflow } from '@ops/platform'
import type { TaskPriority, TaskRecord, TaskRepository } from './task-repository'

const DAY_MS = 24 * 60 * 60 * 1000
const TASK_TYPE = 'task'

const STAGE = {
  backlog: asId('stage-backlog'),
  todo: asId('stage-todo'),
  progress: asId('stage-progress'),
  review: asId('stage-review'),
  done: asId('stage-done'),
}

// Task workflow of the agency template (spec §18.1).
const WORKFLOW: Workflow = {
  id: asId('workflow-task'),
  recordType: TASK_TYPE,
  name: 'Tasks',
  defaultStageId: STAGE.todo,
  stages: [
    { id: STAGE.backlog, name: 'Backlog', category: 'backlog', color: 'gray', position: 0 },
    { id: STAGE.todo, name: 'To do', category: 'open', color: 'blue', position: 1 },
    { id: STAGE.progress, name: 'In progress', category: 'active', color: 'amber', position: 2 },
    { id: STAGE.review, name: 'Review', category: 'waiting', color: 'violet', position: 3 },
    { id: STAGE.done, name: 'Done', category: 'done_success', color: 'green', position: 4 },
  ],
}

type Seed = readonly [title: string, stageId: Id, priority: TaskPriority, startDay: number, dueDay: number]

const SEEDS: readonly Seed[] = [
  ['Draft onboarding checklist', STAGE.todo, 'high', -2, 1],
  ['Collect quarterly figures', STAGE.progress, 'medium', -4, 2],
  ['Review homepage copy', STAGE.review, 'low', -3, 0],
  ['Prepare kickoff agenda', STAGE.backlog, 'none', 2, 5],
  ['Update service catalogue', STAGE.progress, 'urgent', -1, 3],
  ['Schedule photo session', STAGE.todo, 'medium', 1, 6],
  ['Archive old proposals', STAGE.done, 'low', -8, -5],
  ['Plan newsletter issue', STAGE.backlog, 'medium', 4, 10],
]

function seedTasks(now: number): Map<Id, TaskRecord> {
  const today = Math.floor(now / DAY_MS) * DAY_MS
  return new Map(
    SEEDS.map(([title, stageId, priority, startDay, dueDay], index) => {
      const id = asId(`task-${String(index + 1)}`)
      const startAt = today + startDay * DAY_MS
      const dueAt = today + dueDay * DAY_MS
      const base = { id, title, workflowId: WORKFLOW.id, stageId, priority, assigneeIds: [] }
      return [id, { ...base, stageEnteredAt: now, updatedAt: now, startAt, dueAt }]
    }),
  )
}

const tasks = seedTasks(Date.now())

function toStageRecord(task: TaskRecord): StageTrackedRecord {
  const { id, workflowId, stageId, stageEnteredAt, updatedAt, assigneeIds } = task
  return { ref: { type: TASK_TYPE, id }, workflowId, stageId, stageEnteredAt, updatedAt, assigneeIds }
}

function update(id: Id, expectedUpdatedAt: number, patch: Partial<TaskRecord>): TaskRecord | undefined {
  const current = tasks.get(id)
  if (current?.updatedAt !== expectedUpdatedAt) return undefined
  const next = { ...current, ...patch, updatedAt: Math.max(Date.now(), current.updatedAt + 1) }
  tasks.set(id, next)
  return next
}

/** In-memory task repository for local development until Payload is wired. */
export const memoryTaskRepository: TaskRepository = {
  loadTaskWorkflow: () => Promise.resolve(WORKFLOW),
  listTasks: () => Promise.resolve([...tasks.values()]),
  loadRecord: (ref) => {
    const task = ref.type === TASK_TYPE ? tasks.get(ref.id) : undefined
    return Promise.resolve(task && toStageRecord(task))
  },
  loadWorkflow: (id) => Promise.resolve(id === WORKFLOW.id ? WORKFLOW : undefined),
  saveStage: (input) => {
    const patch = { stageId: input.stageId, stageEnteredAt: input.stageEnteredAt }
    const saved = update(input.ref.id, input.expectedUpdatedAt, patch)
    return Promise.resolve(saved && toStageRecord(saved))
  },
  addTransition: () => Promise.resolve(),
  addActivity: () => Promise.resolve(),
  saveDates: ({ id, startAt, dueAt, expectedUpdatedAt }) =>
    Promise.resolve(update(id, expectedUpdatedAt, { startAt, dueAt })),
}
