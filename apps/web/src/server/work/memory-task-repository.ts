import { asId, type Id } from '@ops/kernel'
import type { StageTrackedRecord, Workflow } from '@ops/platform'
import type { TaskPriority, TaskRecord, TaskRepository } from './task-repository'

const DAY_MS = 24 * 60 * 60 * 1000
const TASK_TYPE = 'task'

// The task workflow of the agency template (spec §18.1).
const WORKFLOW: Workflow = {
  id: asId('workflow-task'),
  recordType: TASK_TYPE,
  name: 'Tasks',
  defaultStageId: asId('stage-todo'),
  stages: [
    { id: asId('stage-backlog'), name: 'Backlog', category: 'backlog', color: 'gray', position: 0 },
    { id: asId('stage-todo'), name: 'To do', category: 'open', color: 'blue', position: 1 },
    { id: asId('stage-progress'), name: 'In progress', category: 'active', color: 'amber', position: 2 },
    { id: asId('stage-review'), name: 'Review', category: 'waiting', color: 'violet', position: 3 },
    { id: asId('stage-done'), name: 'Done', category: 'done_success', color: 'green', position: 4 },
  ],
}

type Seed = readonly [title: string, stage: string, priority: TaskPriority, startDay: number, dueDay: number]

const SEEDS: readonly Seed[] = [
  ['Draft onboarding checklist', 'stage-todo', 'high', -2, 1],
  ['Collect quarterly figures', 'stage-progress', 'medium', -4, 2],
  ['Review homepage copy', 'stage-review', 'low', -3, 0],
  ['Prepare kickoff agenda', 'stage-backlog', 'none', 2, 5],
  ['Update service catalogue', 'stage-progress', 'urgent', -1, 3],
  ['Schedule photo session', 'stage-todo', 'medium', 1, 6],
  ['Archive old proposals', 'stage-done', 'low', -8, -5],
  ['Plan newsletter issue', 'stage-backlog', 'medium', 4, 10],
]

function seedTasks(now: number): Map<Id, TaskRecord> {
  const today = Math.floor(now / DAY_MS) * DAY_MS
  const entries = SEEDS.map(([title, stage, priority, startDay, dueDay], index): [Id, TaskRecord] => {
    const id = asId(`task-${String(index + 1)}`)
    const task: TaskRecord = {
      id,
      title,
      workflowId: WORKFLOW.id,
      stageId: asId(stage),
      stageEnteredAt: now,
      updatedAt: now,
      priority,
      assigneeIds: [],
      startAt: today + startDay * DAY_MS,
      dueAt: today + dueDay * DAY_MS,
    }
    return [id, task]
  })
  return new Map(entries)
}

// Module state lives for the dev server process; it is development wiring, never deployed (see `getWorkDeps`).
const tasks = seedTasks(Date.now())

function toStageRecord(task: TaskRecord): StageTrackedRecord {
  const { id, workflowId, stageId, stageEnteredAt, updatedAt, assigneeIds } = task
  return { ref: { type: TASK_TYPE, id }, workflowId, stageId, stageEnteredAt, updatedAt, assigneeIds }
}

function update(id: Id, expectedUpdatedAt: number, patch: Partial<TaskRecord>): TaskRecord | undefined {
  const current = tasks.get(id)
  if (current === undefined || current.updatedAt !== expectedUpdatedAt) return undefined
  const next: TaskRecord = { ...current, ...patch, updatedAt: Math.max(Date.now(), current.updatedAt + 1) }
  tasks.set(id, next)
  return next
}

/** In-memory `TaskRepository` with seeded tasks and compare-and-set writes, for local development before Payload wiring. */
export const memoryTaskRepository: TaskRepository = {
  loadTaskWorkflow: () => Promise.resolve(WORKFLOW),
  listTasks: () => Promise.resolve([...tasks.values()]),
  loadRecord: (ref) => {
    const task = ref.type === TASK_TYPE ? tasks.get(ref.id) : undefined
    return Promise.resolve(task === undefined ? undefined : toStageRecord(task))
  },
  loadWorkflow: (id) => Promise.resolve(id === WORKFLOW.id ? WORKFLOW : undefined),
  saveStage: (input) => {
    const patch = { stageId: input.stageId, stageEnteredAt: input.stageEnteredAt }
    const saved = update(input.ref.id, input.expectedUpdatedAt, patch)
    return Promise.resolve(saved === undefined ? undefined : toStageRecord(saved))
  },
  // Transitions and activity are persisted by the Payload repository; the in-memory store keeps only current state.
  addTransition: () => Promise.resolve(),
  addActivity: () => Promise.resolve(),
  saveDates: (input) =>
    Promise.resolve(update(input.id, input.expectedUpdatedAt, { startAt: input.startAt, dueAt: input.dueAt })),
}
