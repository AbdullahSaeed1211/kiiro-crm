/* eslint-disable */
import { asId, domainError, err, ok, type Id } from '@ops/kernel'
import type { Actor } from '@ops/platform'
import { hasAncestorCycle, MAX_SUBTASK_DEPTH, subtaskDepth } from '../domain/rules'
import type { TaskDraft, TaskPatch, WorkDeps, WorkResult, WorkTaskRecord } from '../ports/work'
export { completeTask, moveTask, reopenTask, setTaskDates } from './task-stage'

const fail = <T>(code: Parameters<typeof domainError>[0], message: string): WorkResult<T> =>
  err(domainError(code, message))
const objectInput = (input: unknown): Record<string, unknown> | undefined =>
  typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : undefined
const isManagerUp = (actor: Actor): boolean => actor.role === 'owner' || actor.role === 'manager'
const validTitle = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '' && value.trim().length <= 300
const validDate = (value: unknown): value is number | null =>
  value === null || (typeof value === 'number' && Number.isFinite(value))
const optionalDate = (value: Record<string, unknown>, key: string): number | null | undefined =>
  value[key] === undefined ? null : validDate(value[key]) ? value[key] : undefined
const resource = (task: WorkTaskRecord) => ({
  type: 'task',
  assigneeIds: task.assigneeIds,
  ...(task.groupId === null ? {} : { groupId: task.groupId }),
})
const canUpdate = (deps: WorkDeps, task: WorkTaskRecord) => deps.can(deps.actor, 'update', resource(task))
const idValue = (value: unknown): Id | null | undefined =>
  value === undefined || value === null ? null : typeof value === 'string' ? asId(value) : undefined
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
function parseCreate(input: unknown): TaskDraft | undefined {
  const value = objectInput(input)
  if (value === undefined || !validTitle(value['title'])) return undefined
  const projectId = idValue(value['projectId']),
    parentTaskId = idValue(value['parentTaskId']),
    groupId = idValue(value['groupId']),
    relatedId = idValue(value['relatedId'])
  const assignees = value['assigneeIds'] === undefined ? [] : value['assigneeIds']
  const priority = value['priority'] === undefined ? 'none' : value['priority']
  if (
    projectId === undefined ||
    parentTaskId === undefined ||
    groupId === undefined ||
    relatedId === undefined ||
    !Array.isArray(assignees) ||
    !assignees.every((id) => typeof id === 'string') ||
    !(typeof priority === 'string' && ['none', 'low', 'medium', 'high', 'urgent'].includes(priority)) ||
    optionalDate(value, 'startAt') === undefined ||
    optionalDate(value, 'dueAt') === undefined
  )
    return undefined
  const startAt = optionalDate(value, 'startAt'),
    dueAt = optionalDate(value, 'dueAt')
  if (startAt === undefined || dueAt === undefined) return undefined
  if (typeof startAt === 'number' && typeof dueAt === 'number' && startAt > dueAt) return undefined
  const fields = new Set([
    'title',
    'description',
    'projectId',
    'parentTaskId',
    'assigneeIds',
    'groupId',
    'priority',
    'relatedType',
    'relatedId',
    'startAt',
    'dueAt',
  ])
  if (
    Object.keys(value).some((key) => !fields.has(key)) ||
    (value['description'] !== undefined &&
      value['description'] !== null &&
      (typeof value['description'] !== 'string' || value['description'].length > 20_000))
  )
    return undefined
  return {
    title: (value['title'] as string).trim(),
    description: (value['description'] === undefined ? null : value['description']) as string | null,
    projectId,
    parentTaskId,
    assigneeIds: assignees.map(asId),
    groupId,
    priority: priority as NonNullable<TaskDraft['priority']>,
    relatedType: (value['relatedType'] === undefined ? null : value['relatedType']) as string | null,
    relatedId,
    startAt,
    dueAt,
  }
}
/** Creates a task after checking visibility, hierarchy, assignment, and related-record scope. */
export async function createTask(deps: WorkDeps, input: unknown): Promise<WorkResult<WorkTaskRecord>> {
  const draft = parseCreate(input)
  if (draft === undefined) return fail('VALIDATION', 'task fields are invalid')
  if (!deps.can(deps.actor, 'create', { type: 'task' })) return fail('FORBIDDEN', 'not allowed to create tasks')
  const workflow = await deps.repo.loadDefaultWorkflow('task'),
    parent = await parentFor(deps, draft.parentTaskId ?? null)
  if (!parent.ok) return parent
  if (parent.value !== null && draft.projectId !== null && draft.projectId !== parent.value.projectId)
    return fail('VALIDATION', 'subtasks inherit their parent project')
  const projectId = parent.value?.projectId ?? draft.projectId ?? null
  const visible = await projectAllowed(deps, projectId)
  if (!visible.ok) return visible
  const assigneeIds = draft.assigneeIds?.length ? draft.assigneeIds : [deps.actor.id]
  if (!assignmentAllowed(deps, assigneeIds, draft.groupId ?? null))
    return fail('FORBIDDEN', 'cannot assign task outside your scope')
  if (!(await relatedAllowed(deps, draft.relatedType ?? null, draft.relatedId ?? null)))
    return fail('FORBIDDEN', 'related record is outside your scope')
  return ok(
    await deps.repo.createTask({
      ...draft,
      projectId,
      parentTaskId: draft.parentTaskId ?? null,
      assigneeIds,
      groupId: draft.groupId ?? null,
      workflowId: workflow.id,
      stageId: workflow.defaultStageId,
    }),
  )
}
function parsePatch(input: unknown): TaskPatch | undefined {
  const value = objectInput(input)
  if (value === undefined) return undefined
  const fields = new Set(['title', 'description', 'priority', 'assigneeIds', 'groupId', 'relatedType', 'relatedId'])
  const ids = value['assigneeIds']
  if (
    Object.keys(value).some((key) => !fields.has(key)) ||
    ('title' in value && !validTitle(value['title'])) ||
    ('description' in value &&
      value['description'] !== null &&
      (typeof value['description'] !== 'string' || value['description'].length > 20_000)) ||
    ('priority' in value && !['none', 'low', 'medium', 'high', 'urgent'].includes(String(value['priority']))) ||
    ('assigneeIds' in value && (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string'))) ||
    ('groupId' in value && idValue(value['groupId']) === undefined) ||
    ('relatedId' in value && idValue(value['relatedId']) === undefined) ||
    ('relatedType' in value && value['relatedType'] !== null && typeof value['relatedType'] !== 'string')
  )
    return undefined
  return {
    ...('title' in value ? { title: (value['title'] as string).trim() } : {}),
    ...('description' in value ? { description: value['description'] as string | null } : {}),
    ...('priority' in value ? { priority: value['priority'] as NonNullable<TaskDraft['priority']> } : {}),
    ...('assigneeIds' in value ? { assigneeIds: (ids as string[]).map(asId) } : {}),
    ...('groupId' in value ? { groupId: idValue(value['groupId']) as Id | null } : {}),
    ...('relatedType' in value ? { relatedType: value['relatedType'] as string | null } : {}),
    ...('relatedId' in value ? { relatedId: idValue(value['relatedId']) as Id | null } : {}),
  }
}
/** Updates editable task fields only; stage, dates, and completion use dedicated commands. */
export async function updateTask(deps: WorkDeps, input: unknown): Promise<WorkResult<WorkTaskRecord>> {
  const value = objectInput(input),
    patch = value?.['patch'] === undefined ? undefined : parsePatch(value['patch'])
  if (
    value === undefined ||
    typeof value['taskId'] !== 'string' ||
    typeof value['expectedUpdatedAt'] !== 'number' ||
    !Number.isFinite(value['expectedUpdatedAt']) ||
    patch === undefined ||
    Object.keys(patch).length === 0
  )
    return fail('VALIDATION', 'task patch is invalid')
  const task = await deps.repo.getTask(asId(value['taskId']))
  if (task === undefined) return fail('NOT_FOUND', 'task not found')
  if (task.updatedAt !== value['expectedUpdatedAt']) return fail('CONFLICT', 'task was updated by someone else')
  if (!canUpdate(deps, task)) return fail('FORBIDDEN', 'not allowed to update this task')
  const ids = patch.assigneeIds ?? task.assigneeIds,
    groupId = patch.groupId === undefined ? task.groupId : patch.groupId
  if (!assignmentAllowed(deps, ids, groupId)) return fail('FORBIDDEN', 'cannot assign task outside your scope')
  const type = patch.relatedType === undefined ? task.relatedType : patch.relatedType,
    id = patch.relatedId === undefined ? task.relatedId : patch.relatedId
  if (!(await relatedAllowed(deps, type, id))) return fail('FORBIDDEN', 'related record is outside your scope')
  const saved = await deps.repo.updateTask(task.id, patch, value['expectedUpdatedAt'])
  return saved === undefined ? fail('CONFLICT', 'task was updated by someone else') : ok(saved)
}
