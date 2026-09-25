import { asId } from '@ops/kernel'
import type { Actor, Workflow } from '@ops/platform'
import type { ProjectRecord, WorkDeps, WorkRepository, WorkTaskRecord } from '../src'

/** In-memory fixtures and a stub repository for work use-case tests. */
export const task = (id: string, extra: Partial<WorkTaskRecord> = {}): WorkTaskRecord => ({
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
export const actor = (role: Actor['role'], id = 'staff'): Actor => ({
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
export const project = (id = 'project'): ProjectRecord => ({
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
export const createMemoryRepo = (): WorkRepository =>
  ({
    getProject: () => Promise.resolve(project()),
    loadDefaultWorkflow: () => Promise.resolve(workflow),
    loadWorkflow: () => Promise.resolve(workflow),
    getTask: () => Promise.resolve(undefined),
    listTasks: () => Promise.resolve([]),
    listChildren: () => Promise.resolve([]),
    createTask: () => Promise.resolve(task('created')),
    createProject: () => Promise.resolve(project()),
    updateTask: () => Promise.resolve(undefined),
    saveTaskMove: () => Promise.resolve(undefined),
  }) as unknown as WorkRepository
export const depsFor = (input: Partial<WorkDeps> = {}): WorkDeps => ({
  actor: actor('staff'),
  can: () => true,
  repo: createMemoryRepo(),
  uow: { run: async <T>(work: () => Promise<T>) => work() },
  clock: { now: () => 10 },
  ...input,
})
