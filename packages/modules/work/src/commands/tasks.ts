import { ok, type Id } from '@ops/kernel'
import type { TaskPatch, WorkDeps, WorkResult, WorkTaskRecord } from '../ports/work'
import { fail, isManagerUp } from './input'
import { parseCreate, parseUpdate, type ParsedTaskDraft } from './task-input'
import { hasAncestorCycle, MAX_SUBTASK_DEPTH, subtaskDepth } from '../domain/rules'
export { completeTask, moveTask, reopenTask, setTaskDates } from './task-stage'
const resource = (task: WorkTaskRecord) => ({
  type: 'task',
  assigneeIds: task.assigneeIds,
  ...(task.groupId === null ? {} : { groupId: task.groupId }),
})
const canUpdate = (deps: WorkDeps, task: WorkTaskRecord) => deps.can(deps.actor, 'update', resource(task))
const assignmentAllowed = (deps: WorkDeps, ids: readonly Id[], groupId: Id | null) =>
  (isManagerUp(deps.actor) || ids.every((id) => id === deps.actor.id)) &&
  (groupId === null || deps.actor.groupIds.includes(groupId))
async function relatedAllowed(deps: WorkDeps, type: string | null, id: Id | null): Promise<boolean> {
  return (
    (type === null && id === null) ||
    isManagerUp(deps.actor) ||
    (type !== null && id !== null && (await deps.readRecord?.(type, id)) === true)
  )
}
async function parentFor(deps: WorkDeps, id: Id | null): Promise<WorkResult<WorkTaskRecord | null>> {
  if (id === null) return ok(null)
  const parent = await deps.repo.getTask(id)
  if (parent === undefined) return fail('NOT_FOUND', 'parent task not found')
  if (!deps.can(deps.actor, 'read', resource(parent))) return fail('FORBIDDEN', 'parent task is outside your scope')
  const records = new Map((await deps.repo.listTasks()).map((task) => [task.id, task]))
  if (hasAncestorCycle(parent, records)) return fail('VALIDATION', 'task hierarchy contains a cycle')
  return subtaskDepth(parent, records) >= MAX_SUBTASK_DEPTH
    ? fail('VALIDATION', 'subtasks may be nested only two levels deep')
    : ok(parent)
}
async function projectAllowed(deps: WorkDeps, id: Id | null): Promise<WorkResult<null>> {
  if (id === null) return ok(null)
  const project = await deps.repo.getProject(id)
  if (project === undefined) return fail('NOT_FOUND', 'project not found')
  const visible = deps.can(deps.actor, 'read', {
    type: 'project',
    assigneeIds: project.memberIds,
    ...(project.ownerId === null ? {} : { ownerId: project.ownerId }),
  })
  return visible ? ok(null) : fail('FORBIDDEN', 'project is outside your scope')
}
async function resolveProject(
  deps: WorkDeps,
  draft: ParsedTaskDraft,
  parent: WorkTaskRecord | null,
): Promise<WorkResult<Id | null>> {
  if (parent !== null && draft.projectId !== null && draft.projectId !== parent.projectId)
    return fail('VALIDATION', 'subtasks inherit their parent project')
  const projectId = parent?.projectId ?? draft.projectId
  const visible = await projectAllowed(deps, projectId)
  return visible.ok ? ok(projectId) : visible
}

function authorizeAssignment(deps: WorkDeps, draft: ParsedTaskDraft): WorkResult<readonly Id[]> {
  const assigneeIds = draft.assigneeIds.length ? draft.assigneeIds : [deps.actor.id]
  return assignmentAllowed(deps, assigneeIds, draft.groupId)
    ? ok(assigneeIds)
    : fail('FORBIDDEN', 'cannot assign task outside your scope')
}

/** Creates a task after checking visibility, hierarchy, assignment, and related-record scope. */
export async function createTask(deps: WorkDeps, input: unknown): Promise<WorkResult<WorkTaskRecord>> {
  const parsed = parseCreate(input)
  if (!parsed.ok) return parsed
  const draft = parsed.value
  if (!deps.can(deps.actor, 'create', { type: 'task' })) return fail('FORBIDDEN', 'not allowed to create tasks')

  const workflow = await deps.repo.loadDefaultWorkflow('task')
  const parent = await parentFor(deps, draft.parentTaskId)
  if (!parent.ok) return parent

  const projectId = await resolveProject(deps, draft, parent.value)
  if (!projectId.ok) return projectId

  const assigneeIds = authorizeAssignment(deps, draft)
  if (!assigneeIds.ok) return assigneeIds

  if (!(await relatedAllowed(deps, draft.relatedType, draft.relatedId)))
    return fail('FORBIDDEN', 'related record is outside your scope')

  return ok(
    await deps.repo.createTask({
      ...draft,
      projectId: projectId.value,
      assigneeIds: assigneeIds.value,
      workflowId: workflow.id,
      stageId: workflow.defaultStageId,
    }),
  )
}
async function checkRelated(deps: WorkDeps, patch: TaskPatch, task: WorkTaskRecord): Promise<boolean> {
  const type = patch.relatedType === undefined ? task.relatedType : patch.relatedType
  const id = patch.relatedId === undefined ? task.relatedId : patch.relatedId
  return relatedAllowed(deps, type, id)
}

function checkAssignment(deps: WorkDeps, patch: TaskPatch, task: WorkTaskRecord): boolean {
  if (patch.assigneeIds === undefined && patch.groupId === undefined) return true
  const ids = patch.assigneeIds ?? task.assigneeIds
  const groupId = patch.groupId === undefined ? task.groupId : patch.groupId
  return assignmentAllowed(deps, ids, groupId)
}

async function authorizeTaskUpdate(deps: WorkDeps, patch: TaskPatch, task: WorkTaskRecord): Promise<WorkResult<null>> {
  if (!checkAssignment(deps, patch, task)) return fail('FORBIDDEN', 'cannot assign task outside your scope')
  if (!(await checkRelated(deps, patch, task))) return fail('FORBIDDEN', 'related record is outside your scope')
  return ok(null)
}

async function getAndCheckTask(
  deps: WorkDeps,
  taskId: Id,
  expectedUpdatedAt: number,
): Promise<WorkResult<WorkTaskRecord>> {
  const task = await deps.repo.getTask(taskId)
  if (task === undefined) return fail('NOT_FOUND', 'task not found')
  if (task.updatedAt !== expectedUpdatedAt) return fail('CONFLICT', 'task was updated by someone else')
  if (!canUpdate(deps, task)) return fail('FORBIDDEN', 'not allowed to update this task')
  return ok(task)
}

async function persistTaskUpdate(
  deps: WorkDeps,
  options: { task: WorkTaskRecord; patch: TaskPatch; expectedUpdatedAt: number },
): Promise<WorkResult<WorkTaskRecord>> {
  const saved = await deps.repo.updateTask(options.task.id, options.patch, options.expectedUpdatedAt)
  return saved === undefined ? fail('CONFLICT', 'task was updated by someone else') : ok(saved)
}

/** Updates editable task fields only; stage, dates, and completion use dedicated commands. */
export async function updateTask(deps: WorkDeps, input: unknown): Promise<WorkResult<WorkTaskRecord>> {
  const parsed = parseUpdate(input)
  if (!parsed.ok) return parsed
  const update = parsed.value
  const task = await getAndCheckTask(deps, update.taskId, update.expectedUpdatedAt)
  if (!task.ok) return task
  const authorized = await authorizeTaskUpdate(deps, update.patch, task.value)
  if (!authorized.ok) return authorized
  return persistTaskUpdate(deps, { ...update, task: task.value })
}
