import { asId, domainError, err, invalidInput, ok, type Id } from '@ops/kernel'
import type { StageCategory, StageTransition } from '@ops/platform'
import { moveTaskSchema } from '../schema'
import { fail } from './input'
import { hasOpenChildren } from '../domain/rules'
import { rankBetween } from '../domain/rank'
import type { WorkDeps, WorkResult, WorkTaskRecord } from '../ports/work'

const conflict = <T>(message: string): WorkResult<T> => err(domainError('CONFLICT', message))
const CONFLICT_OPEN_SUBTASKS = 'parent task has open subtasks'
const CONFLICT_UPDATED = 'task was updated by someone else'
const FORBIDDEN_UPDATE_TASK = 'not allowed to update this task'
const NOT_FOUND_TASK = 'task not found'
interface MoveInput {
  readonly taskId: Id
  readonly toStageId: Id
  readonly expectedUpdatedAt: number
  readonly beforeTaskId?: Id
  readonly afterTaskId?: Id
}

function parseMove(input: unknown): WorkResult<MoveInput> {
  const parsed = moveTaskSchema.safeParse(input)
  if (!parsed.success)
    return err(invalidInput('taskId, toStageId and expectedUpdatedAt are required', parsed.error.issues))
  const { taskId, toStageId, expectedUpdatedAt, beforeTaskId, afterTaskId } = parsed.data
  return ok({
    taskId: asId(taskId),
    toStageId: asId(toStageId),
    expectedUpdatedAt,
    ...(beforeTaskId === undefined ? {} : { beforeTaskId: asId(beforeTaskId) }),
    ...(afterTaskId === undefined ? {} : { afterTaskId: asId(afterTaskId) }),
  })
}
interface NeighborOptions {
  readonly id: Id | undefined
  readonly task: WorkTaskRecord
  readonly destinationStageId: Id
  readonly label: string
}

async function neighbor(deps: WorkDeps, options: NeighborOptions): Promise<WorkResult<WorkTaskRecord | undefined>> {
  if (options.id === undefined) return ok(undefined)
  if (options.id === options.task.id) return fail('VALIDATION', `${options.label} neighbor cannot be the moved task`)
  const row = await deps.repo.getTask(options.id)
  if (row === undefined) return fail('VALIDATION', `${options.label} neighbor not found`)
  if (
    row.workflowId !== options.task.workflowId ||
    row.stageId !== options.destinationStageId ||
    row.projectId !== options.task.projectId
  )
    return fail('VALIDATION', `${options.label} neighbor is outside the destination context`)
  return ok(row)
}
function transitionFor(
  task: WorkTaskRecord,
  input: { readonly toStageId: Id; readonly category: StageCategory; readonly now: number; readonly actorId: Id },
): StageTransition {
  return {
    record: { type: 'task', id: task.id },
    workflowId: task.workflowId,
    fromStageId: task.stageId,
    toStageId: input.toStageId,
    fromCategory: task.stageCategory,
    toCategory: input.category,
    changedBy: input.actorId,
    changedAt: input.now,
    durationMs: Math.max(0, input.now - task.stageEnteredAt),
  }
}
async function validateDestinationStage(
  deps: WorkDeps,
  task: WorkTaskRecord,
  stageId: Id,
): Promise<WorkResult<StageCategory>> {
  const workflow = await deps.repo.loadWorkflow(task.workflowId)
  const destination = workflow?.stages.find((stage) => stage.id === stageId)
  if (destination === undefined) return fail('VALIDATION', 'stage is not part of the task workflow')
  if (destination.category === 'done_success' && hasOpenChildren(await deps.repo.listChildren(task.id)))
    return conflict(CONFLICT_OPEN_SUBTASKS)
  return ok(destination.category)
}

async function validateNeighbors(
  deps: WorkDeps,
  task: WorkTaskRecord,
  move: MoveInput,
): Promise<WorkResult<{ readonly before: WorkTaskRecord | undefined; readonly after: WorkTaskRecord | undefined }>> {
  const before = await neighbor(deps, {
    id: move.beforeTaskId,
    task,
    destinationStageId: move.toStageId,
    label: 'before',
  })
  if (!before.ok) return before
  const after = await neighbor(deps, { id: move.afterTaskId, task, destinationStageId: move.toStageId, label: 'after' })
  if (!after.ok) return after
  if (before.value !== undefined && after.value !== undefined && before.value.rank >= after.value.rank)
    return fail('VALIDATION', 'rank neighbors are in the wrong order')
  return ok({ before: before.value, after: after.value })
}

async function destinationFor(
  deps: WorkDeps,
  task: WorkTaskRecord,
  move: MoveInput,
): Promise<WorkResult<{ readonly category: StageCategory; readonly rank: string }>> {
  const category = await validateDestinationStage(deps, task, move.toStageId)
  if (!category.ok) return category
  const neighbors = await validateNeighbors(deps, task, move)
  if (!neighbors.ok) return neighbors
  return ok({
    category: category.value,
    rank: rankBetween(neighbors.value.before?.rank, neighbors.value.after?.rank),
  })
}

function validateTaskForMove(task: WorkTaskRecord, expectedUpdatedAt: number): WorkResult<null> {
  if (task.updatedAt !== expectedUpdatedAt) return conflict(CONFLICT_UPDATED)
  return ok(null)
}

function authorizeTaskUpdate(deps: WorkDeps, task: WorkTaskRecord): WorkResult<null> {
  if (
    !deps.can(deps.actor, 'update', {
      type: 'task',
      assigneeIds: task.assigneeIds,
      ...(task.groupId === null ? {} : { groupId: task.groupId }),
    })
  )
    return fail('FORBIDDEN', FORBIDDEN_UPDATE_TASK)
  return ok(null)
}

/** Moves a task and persists all stage-related fields through one CAS unit. */
export async function moveTask(deps: WorkDeps, input: unknown): Promise<WorkResult<WorkTaskRecord>> {
  const parsed = parseMove(input)
  if (!parsed.ok) return parsed
  const move = parsed.value
  const task = await deps.repo.getTask(move.taskId)
  if (task === undefined) return fail('NOT_FOUND', NOT_FOUND_TASK)
  const validate = validateTaskForMove(task, move.expectedUpdatedAt)
  if (!validate.ok) return validate
  const auth = authorizeTaskUpdate(deps, task)
  if (!auth.ok) return auth
  const destination = await destinationFor(deps, task, move)
  if (!destination.ok) return destination
  const now = deps.clock.now()
  const saved = await deps.repo.saveTaskMove({
    taskId: task.id,
    toStageId: move.toStageId,
    stageEnteredAt: now,
    rank: destination.value.rank,
    completedAt: destination.value.category === 'done_success' ? now : null,
    expectedUpdatedAt: move.expectedUpdatedAt,
    transition: transitionFor(task, {
      toStageId: move.toStageId,
      category: destination.value.category,
      now,
      actorId: deps.actor.id,
    }),
  })
  return saved === undefined ? conflict(CONFLICT_UPDATED) : ok(saved)
}
/** Moves a task to the workflow's successful terminal stage. */
export async function completeTask(
  deps: WorkDeps,
  taskId: Id,
  expectedUpdatedAt: number,
): Promise<WorkResult<WorkTaskRecord>> {
  const task = await deps.repo.getTask(taskId)
  if (task === undefined) return fail('NOT_FOUND', NOT_FOUND_TASK)
  const workflow = await deps.repo.loadWorkflow(task.workflowId)
  const done = workflow?.stages.find((stage) => stage.category === 'done_success')
  return done === undefined
    ? fail('VALIDATION', 'task workflow has no completed stage')
    : moveTask(deps, { taskId, toStageId: done.id, expectedUpdatedAt })
}
/** Moves a task back to its workflow default stage. */
export async function reopenTask(
  deps: WorkDeps,
  taskId: Id,
  expectedUpdatedAt: number,
): Promise<WorkResult<WorkTaskRecord>> {
  const task = await deps.repo.getTask(taskId)
  if (task === undefined) return fail('NOT_FOUND', NOT_FOUND_TASK)
  const workflow = await deps.repo.loadWorkflow(task.workflowId)
  return workflow === undefined
    ? fail('NOT_FOUND', 'task workflow not found')
    : moveTask(deps, { taskId, toStageId: workflow.defaultStageId, expectedUpdatedAt })
}
interface SetDatesInput {
  readonly taskId: Id
  readonly startAt: number | null
  readonly dueAt: number | null
  readonly expectedUpdatedAt: number
}

function validateDatesAreFinite(input: SetDatesInput): boolean {
  return (
    Number.isFinite(input.expectedUpdatedAt) &&
    (input.startAt === null || Number.isFinite(input.startAt)) &&
    (input.dueAt === null || Number.isFinite(input.dueAt))
  )
}

function validateDateRange(startAt: number | null, dueAt: number | null): boolean {
  return !(startAt !== null && dueAt !== null && startAt > dueAt)
}

function validateDateInput(input: SetDatesInput): WorkResult<null> {
  if (!validateDatesAreFinite(input)) return fail('VALIDATION', 'task dates are invalid')
  if (!validateDateRange(input.startAt, input.dueAt)) return fail('VALIDATION', 'startAt must not be after dueAt')
  return ok(null)
}

/** Updates task dates through the compare-and-set repository path. */
export async function setTaskDates(deps: WorkDeps, input: SetDatesInput): Promise<WorkResult<WorkTaskRecord>> {
  const validateDates = validateDateInput(input)
  if (!validateDates.ok) return validateDates
  const task = await deps.repo.getTask(input.taskId)
  if (task === undefined) return fail('NOT_FOUND', NOT_FOUND_TASK)
  const auth = authorizeTaskUpdate(deps, task)
  if (!auth.ok) return auth
  if (task.updatedAt !== input.expectedUpdatedAt) return conflict(CONFLICT_UPDATED)
  const saved = await deps.repo.updateTask(
    input.taskId,
    { startAt: input.startAt, dueAt: input.dueAt },
    input.expectedUpdatedAt,
  )
  return saved === undefined ? conflict(CONFLICT_UPDATED) : ok(saved)
}
