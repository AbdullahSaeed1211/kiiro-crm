/* eslint-disable */
import { asId, domainError, err, ok, type Id } from '@ops/kernel'
import type { StageCategory, StageTransition } from '@ops/platform'
import { hasOpenChildren } from '../domain/rules'
import { rankBetween } from '../domain/rank'
import type { WorkDeps, WorkResult, WorkTaskRecord } from '../ports/work'

const conflict = <T>(message: string): WorkResult<T> => err(domainError('CONFLICT', message))
const fail = <T>(code: Parameters<typeof domainError>[0], message: string): WorkResult<T> =>
  err(domainError(code, message))
interface MoveInput {
  readonly taskId: Id
  readonly toStageId: Id
  readonly expectedUpdatedAt: number
  readonly beforeTaskId?: Id
  readonly afterTaskId?: Id
}
function parseMove(input: unknown): MoveInput | undefined {
  if (typeof input !== 'object' || input === null) return undefined
  const value = input as Record<string, unknown>
  if (
    typeof value['taskId'] !== 'string' ||
    typeof value['toStageId'] !== 'string' ||
    typeof value['expectedUpdatedAt'] !== 'number' ||
    !Number.isFinite(value['expectedUpdatedAt'])
  )
    return undefined
  if (
    (value['beforeTaskId'] !== undefined && typeof value['beforeTaskId'] !== 'string') ||
    (value['afterTaskId'] !== undefined && typeof value['afterTaskId'] !== 'string')
  )
    return undefined
  return {
    taskId: asId(value['taskId']),
    toStageId: asId(value['toStageId']),
    expectedUpdatedAt: value['expectedUpdatedAt'],
    ...(typeof value['beforeTaskId'] === 'string' ? { beforeTaskId: asId(value['beforeTaskId']) } : {}),
    ...(typeof value['afterTaskId'] === 'string' ? { afterTaskId: asId(value['afterTaskId']) } : {}),
  }
}
async function neighbor(
  deps: WorkDeps,
  id: Id | undefined,
  task: WorkTaskRecord,
  destinationStageId: Id,
  label: string,
): Promise<WorkResult<WorkTaskRecord | undefined>> {
  if (id === undefined) return ok(undefined)
  if (id === task.id) return fail('VALIDATION', `${label} neighbor cannot be the moved task`)
  const row = await deps.repo.getTask(id)
  if (row === undefined) return fail('VALIDATION', `${label} neighbor not found`)
  if (row.workflowId !== task.workflowId || row.stageId !== destinationStageId || row.projectId !== task.projectId)
    return fail('VALIDATION', `${label} neighbor is outside the destination context`)
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
async function destinationFor(
  deps: WorkDeps,
  task: WorkTaskRecord,
  move: MoveInput,
): Promise<WorkResult<{ readonly category: StageCategory; readonly rank: string }>> {
  const workflow = await deps.repo.loadWorkflow(task.workflowId)
  const destination = workflow?.stages.find((stage) => stage.id === move.toStageId)
  if (destination === undefined) return fail('VALIDATION', 'stage is not part of the task workflow')
  if (destination.category === 'done_success' && hasOpenChildren(await deps.repo.listChildren(task.id)))
    return conflict('parent task has open subtasks')
  const before = await neighbor(deps, move.beforeTaskId, task, move.toStageId, 'before')
  const after = await neighbor(deps, move.afterTaskId, task, move.toStageId, 'after')
  if (!before.ok) return before
  if (!after.ok) return after
  if (before.value !== undefined && after.value !== undefined && before.value.rank >= after.value.rank)
    return fail('VALIDATION', 'rank neighbors are in the wrong order')
  return ok({ category: destination.category, rank: rankBetween(before.value?.rank, after.value?.rank) })
}

/** Moves a task and persists all stage-related fields through one CAS unit. */
export async function moveTask(deps: WorkDeps, input: unknown): Promise<WorkResult<WorkTaskRecord>> {
  const move = parseMove(input)
  if (move === undefined) return fail('VALIDATION', 'taskId, toStageId and expectedUpdatedAt are required')
  const task = await deps.repo.getTask(move.taskId)
  if (task === undefined) return fail('NOT_FOUND', 'task not found')
  if (task.updatedAt !== move.expectedUpdatedAt) return conflict('task was updated by someone else')
  if (
    !deps.can(deps.actor, 'update', {
      type: 'task',
      assigneeIds: task.assigneeIds,
      ...(task.groupId === null ? {} : { groupId: task.groupId }),
    })
  )
    return fail('FORBIDDEN', 'not allowed to update this task')
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
  return saved === undefined ? conflict('task was updated by someone else') : ok(saved)
}
/** Moves a task to the workflow's successful terminal stage. */
export async function completeTask(
  deps: WorkDeps,
  taskId: Id,
  expectedUpdatedAt: number,
): Promise<WorkResult<WorkTaskRecord>> {
  const task = await deps.repo.getTask(taskId)
  if (task === undefined) return fail('NOT_FOUND', 'task not found')
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
  if (task === undefined) return fail('NOT_FOUND', 'task not found')
  const workflow = await deps.repo.loadWorkflow(task.workflowId)
  return workflow === undefined
    ? fail('NOT_FOUND', 'task workflow not found')
    : moveTask(deps, { taskId, toStageId: workflow.defaultStageId, expectedUpdatedAt })
}
/** Updates task dates through the compare-and-set repository path. */
export async function setTaskDates(
  deps: WorkDeps,
  input: {
    readonly taskId: Id
    readonly startAt: number | null
    readonly dueAt: number | null
    readonly expectedUpdatedAt: number
  },
): Promise<WorkResult<WorkTaskRecord>> {
  if (
    !Number.isFinite(input.expectedUpdatedAt) ||
    (input.startAt !== null && !Number.isFinite(input.startAt)) ||
    (input.dueAt !== null && !Number.isFinite(input.dueAt))
  )
    return fail('VALIDATION', 'task dates are invalid')
  if (input.startAt !== null && input.dueAt !== null && input.startAt > input.dueAt)
    return fail('VALIDATION', 'startAt must not be after dueAt')
  const task = await deps.repo.getTask(input.taskId)
  if (task === undefined) return fail('NOT_FOUND', 'task not found')
  if (
    !deps.can(deps.actor, 'update', {
      type: 'task',
      assigneeIds: task.assigneeIds,
      ...(task.groupId === null ? {} : { groupId: task.groupId }),
    })
  )
    return fail('FORBIDDEN', 'not allowed to update this task')
  if (task.updatedAt !== input.expectedUpdatedAt) return conflict('task was updated by someone else')
  const saved = await deps.repo.updateTask(
    input.taskId,
    { startAt: input.startAt, dueAt: input.dueAt },
    input.expectedUpdatedAt,
  )
  return saved === undefined ? conflict('task was updated by someone else') : ok(saved)
}
