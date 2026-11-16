import { ok, type Id } from '@ops/kernel'
import type { Actor, Workflow } from '@ops/platform'
import type { TaskDraft, TaskPatch, WorkDeps, WorkResult, WorkTaskRecord } from '../ports/work'
import { fail, isManagerUp } from './input'
import { parseCreate, parseUpdate, type ParsedTaskDraft } from './task-input'
import { hasAncestorCycle, MAX_SUBTASK_DEPTH, subtaskDepth } from '../domain/rules'
import { taskResource } from './task-access'
import { createTodayTaskSchema } from '../schema'
import { todayAsDueAt } from '../domain/due-dates'
import {
  authorizeNewResponsibility,
  notifyAddedAssignees,
  notifyCreatedAssignees,
  prepareResponsibilityPatch,
  withAssignmentActor,
} from './task-responsibility'
export { completeTask, moveTask, reopenTask, setTaskDates } from './task-stage'
const OWNER_ONLY_FORBIDDEN = 'Only owners and managers can mark a task owner only.'

/** Whether the actor may create or edit a task so that only owners and managers can see it. */
export const canMarkTaskOwnerOnly = (actor: Actor): boolean => isManagerUp(actor)

/** A new task is owner only only when an owner or manager says so. */
const createOwnerOnlyAllowed = (deps: WorkDeps, value: boolean): boolean => !value || canMarkTaskOwnerOnly(deps.actor)

/**
 * Staff may not change the mark in either direction: clearing it would let a staff assignee show an owner-only task to
 * every member of the project. `undefined` means the update did not touch the field.
 */
const updateOwnerOnlyAllowed = (deps: WorkDeps, value: boolean | undefined): boolean =>
  value === undefined || canMarkTaskOwnerOnly(deps.actor)

/** True when the actor may edit the task; screens use it to show controls the commands will accept. */
export const canUpdateTask = (deps: Pick<WorkDeps, 'actor' | 'can'>, task: WorkTaskRecord) =>
  deps.can(deps.actor, 'update', taskResource(task))
const canUpdate = canUpdateTask
async function relatedAllowed(deps: WorkDeps, type: string | null, id: Id | null): Promise<boolean> {
  return (
    (type === null && id === null) ||
    isManagerUp(deps.actor) ||
    (type !== null && id !== null && (await deps.readRecord?.(type, id)) === true)
  )
}
/** The task and the chain of its parents, read one at a time; the depth limit and a cycle both stop the walk early. */
async function ancestorsOf(deps: WorkDeps, task: WorkTaskRecord): Promise<Map<Id, WorkTaskRecord>> {
  const chain = new Map<Id, WorkTaskRecord>([[task.id, task]])
  let next = task.parentTaskId
  while (next !== null && !chain.has(next) && chain.size <= MAX_SUBTASK_DEPTH + 1) {
    const parent = await deps.repo.getTask(next)
    if (parent === undefined) break
    chain.set(parent.id, parent)
    next = parent.parentTaskId
  }
  return chain
}

async function parentFor(deps: WorkDeps, id: Id | null): Promise<WorkResult<WorkTaskRecord | null>> {
  if (id === null) return ok(null)
  const parent = await deps.repo.getTask(id)
  if (parent === undefined) return fail('NOT_FOUND', 'parent task not found')
  if (!deps.can(deps.actor, 'read', taskResource(parent))) return fail('FORBIDDEN', 'parent task is outside your scope')
  const records = await ancestorsOf(deps, parent)
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

async function validateTaskCreation(
  deps: WorkDeps,
  draft: ParsedTaskDraft,
): Promise<WorkResult<{ readonly projectId: Id | null; readonly assigneeIds: readonly Id[] }>> {
  const parent = await parentFor(deps, draft.parentTaskId)
  if (!parent.ok) return parent

  const projectId = await resolveProject(deps, draft, parent.value)
  if (!projectId.ok) return projectId

  const assigneeIds = await authorizeNewResponsibility(deps, draft)
  if (!assigneeIds.ok) return assigneeIds

  if (!createOwnerOnlyAllowed(deps, draft.ownerOnly)) return fail('FORBIDDEN', OWNER_ONLY_FORBIDDEN)

  if (!(await relatedAllowed(deps, draft.relatedType, draft.relatedId)))
    return fail('FORBIDDEN', 'related record is outside your scope')

  return ok({ projectId: projectId.value, assigneeIds: assigneeIds.value })
}

function taskDraftForCreate(input: {
  readonly deps: WorkDeps
  readonly draft: ParsedTaskDraft
  readonly validation: { readonly projectId: Id | null; readonly assigneeIds: readonly Id[] }
  readonly workflow: Workflow
}): TaskDraft {
  const { deps, draft, validation, workflow } = input
  const primaryAssigneeId = draft.primaryAssigneeProvided
    ? draft.primaryAssigneeId
    : (draft.primaryAssigneeId ?? validation.assigneeIds[0] ?? null)
  const collaboratorIds = draft.primaryAssigneeProvided ? draft.collaboratorIds : validation.assigneeIds.slice(1)
  return {
    ...draft,
    projectId: validation.projectId,
    assigneeIds: validation.assigneeIds,
    primaryAssigneeId,
    collaboratorIds,
    watcherIds: draft.watcherIds,
    assignedById: deps.actor.id,
    workflowId: workflow.id,
    stageId: workflow.defaultStageId,
  }
}

async function resultAfterCreate(
  deps: WorkDeps,
  result: WorkResult<WorkTaskRecord>,
): Promise<WorkResult<WorkTaskRecord>> {
  if (!result.ok) return result
  await notifyCreatedAssignees(deps, result.value)
  return ok(result.value)
}

/** Creates a task after checking visibility, hierarchy, assignment, and related-record scope. */
export async function createTask(deps: WorkDeps, input: unknown): Promise<WorkResult<WorkTaskRecord>> {
  const parsed = parseCreate(input)
  if (!parsed.ok) return parsed
  const draft = parsed.value
  if (
    !deps.can(deps.actor, 'create', {
      type: 'task',
      parentId: draft.projectId,
      relatedRecordType: draft.relatedType,
      ownerOnly: draft.ownerOnly,
    })
  )
    return fail('FORBIDDEN', 'not allowed to create tasks')

  const workflowResult = await deps.repo.loadDefaultWorkflow('task')
  if (!workflowResult.ok) return workflowResult
  const workflow = workflowResult.value

  const validation = await validateTaskCreation(deps, draft)
  if (!validation.ok) return validation

  return resultAfterCreate(
    deps,
    await deps.repo.createTask(taskDraftForCreate({ deps, draft, validation: validation.value, workflow })),
  )
}

/** Creates one open, no-deadline task for the authenticated person's plan today. */
export async function createTodayTask(
  deps: WorkDeps,
  input: unknown,
  timeZone: string,
): Promise<WorkResult<WorkTaskRecord>> {
  const parsed = createTodayTaskSchema.safeParse(input)
  if (!parsed.success) return fail('VALIDATION', parsed.error.issues[0]?.message ?? 'Enter a title.')
  return deps.uow.run(async () => {
    const created = await createTask(deps, {
      title: parsed.data.title,
      assigneeIds: [deps.actor.id],
      dueAt: null,
    })
    if (!created.ok) return created
    await deps.repo.addTaskToDayPlan({
      taskId: created.value.id,
      userId: deps.actor.id,
      day: todayAsDueAt(deps.clock.now(), timeZone),
    })
    return ok(created.value)
  })
}
async function checkRelated(deps: WorkDeps, patch: TaskPatch, task: WorkTaskRecord): Promise<boolean> {
  const type = patch.relatedType === undefined ? task.relatedType : patch.relatedType
  const id = patch.relatedId === undefined ? task.relatedId : patch.relatedId
  return relatedAllowed(deps, type, id)
}

async function authorizeTaskUpdate(deps: WorkDeps, patch: TaskPatch, task: WorkTaskRecord): Promise<WorkResult<null>> {
  if (!updateOwnerOnlyAllowed(deps, patch.ownerOnly)) return fail('FORBIDDEN', OWNER_ONLY_FORBIDDEN)
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
  const responsibility = await prepareResponsibilityPatch(deps, update.patch, task.value)
  if (!responsibility.ok) return responsibility
  const authorized = await authorizeTaskUpdate(deps, responsibility.value.patch, task.value)
  if (!authorized.ok) return authorized
  return commitTaskUpdate(deps, {
    update,
    task: task.value,
    responsibility: responsibility.value,
  })
}

async function commitTaskUpdate(
  deps: WorkDeps,
  input: {
    readonly update: { readonly taskId: Id; readonly expectedUpdatedAt: number }
    readonly task: WorkTaskRecord
    readonly responsibility: { readonly patch: TaskPatch; readonly changed: boolean }
  },
): Promise<WorkResult<WorkTaskRecord>> {
  const { update, task, responsibility } = input
  const effectivePatch = {
    ...(responsibility.changed ? withAssignmentActor(task, responsibility.patch, deps.actor.id) : responsibility.patch),
    ...(responsibility.patch.blockedReason === null && responsibility.patch.waitingOnId === undefined
      ? { waitingOnId: null }
      : {}),
  }
  const saved = await persistTaskUpdate(deps, { ...update, patch: effectivePatch, task })
  if (saved.ok)
    await notifyAddedAssignees(deps, {
      before: task,
      after: saved.value,
      changed: responsibility.changed,
    })
  if (saved.ok && saved.value.blockedReason !== null)
    await deps.repo.clearCurrentFocusForTask?.(deps.actor.id, saved.value.id)
  return saved
}
