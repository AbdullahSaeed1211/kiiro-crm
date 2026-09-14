import { asId, domainError, err, ok, type Id } from '@ops/kernel'
import { changeStage } from '@ops/platform'
import { hasOpenChildren, MAX_SUBTASK_DEPTH, subtaskDepth } from '../domain/rules'
import { rankBetween, rebalanceRanks } from '../domain/rank'
import type { TaskDraft, WorkDeps, WorkResult, WorkTaskRecord } from '../ports/work'

const TASK_CONFLICT = 'task was updated by someone else'
const TASK_NOT_FOUND = 'task not found'
const TITLE_REQUIRED = 'a task title is required'
const fail = <T>(code: Parameters<typeof domainError>[0], message: string): WorkResult<T> =>
  err(domainError(code, message))
const objectInput = (input: unknown): Record<string, unknown> | undefined =>
  typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : undefined
const title = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 300
const priority = (value: unknown): NonNullable<TaskDraft['priority']> =>
  value === 'urgent' || value === 'high' || value === 'medium' || value === 'low' ? value : 'none'
const resource = (task: WorkTaskRecord) => ({
  type: 'task',
  assigneeIds: task.assigneeIds,
  ...(task.groupId === null ? {} : { groupId: task.groupId }),
})
const allowed = (deps: WorkDeps, task: WorkTaskRecord) => deps.can(deps.actor, 'update', resource(task))
const parentId = (value: Record<string, unknown>): Id | null =>
  typeof value['parentTaskId'] === 'string' ? asId(value['parentTaskId']) : null
const assignees = (deps: WorkDeps, value: Record<string, unknown>): readonly Id[] =>
  Array.isArray(value['assigneeIds'])
    ? value['assigneeIds'].filter((id): id is string => typeof id === 'string').map(asId)
    : [deps.actor.id]

async function parentFor(deps: WorkDeps, parentTaskId: Id | null): Promise<WorkResult<WorkTaskRecord | null>> {
  if (parentTaskId === null) return ok(null)
  const parent = await deps.repo.getTask(parentTaskId)
  if (parent === undefined) return fail('NOT_FOUND', 'parent task not found')
  const all = await deps.repo.listTasks()
  if (subtaskDepth(parent, new Map(all.map((task) => [task.id, task]))) >= MAX_SUBTASK_DEPTH)
    return fail('VALIDATION', 'subtasks may be nested only two levels deep')
  return ok(parent)
}

/** Creates a task in the actor's default task workflow. */
export async function createTask(deps: WorkDeps, input: unknown): Promise<WorkResult<WorkTaskRecord>> {
  const value = objectInput(input)
  if (value === undefined || !title(value['title'])) return fail('VALIDATION', TITLE_REQUIRED)
  const workflow = await deps.repo.loadDefaultWorkflow('task')
  const parentTaskId = parentId(value)
  const parent = await parentFor(deps, parentTaskId)
  if (!parent.ok) return parent
  return ok(
    await deps.repo.createTask({
      title: value['title'].trim(),
      projectId: parent.value?.projectId ?? (typeof value['projectId'] === 'string' ? asId(value['projectId']) : null),
      parentTaskId,
      assigneeIds: assignees(deps, value),
      priority: priority(value['priority']),
      workflowId: workflow.id,
      stageId: workflow.defaultStageId,
      dueAt: typeof value['dueAt'] === 'number' ? value['dueAt'] : null,
    }),
  )
}

interface UpdateInput {
  readonly taskId: Id
  readonly expectedUpdatedAt: number
  readonly patch: Partial<TaskDraft>
}
function parseUpdate(input: unknown): UpdateInput | undefined {
  const value = objectInput(input)
  if (value === undefined || typeof value['taskId'] !== 'string' || typeof value['expectedUpdatedAt'] !== 'number')
    return undefined
  return {
    taskId: asId(value['taskId']),
    expectedUpdatedAt: value['expectedUpdatedAt'],
    patch: value['patch'] ?? {},
  }
}

/** Updates a task with compare-and-set protection. */
export async function updateTask(deps: WorkDeps, input: unknown): Promise<WorkResult<WorkTaskRecord>> {
  const update = parseUpdate(input)
  if (update === undefined) return fail('VALIDATION', 'taskId and expectedUpdatedAt are required')
  const task = await deps.repo.getTask(update.taskId)
  if (task === undefined) return fail('NOT_FOUND', TASK_NOT_FOUND)
  if (!allowed(deps, task)) return fail('FORBIDDEN', 'not allowed to update this task')
  if ('title' in update.patch && !title(update.patch.title)) return fail('VALIDATION', TITLE_REQUIRED)
  const saved = await deps.repo.updateTask(task.id, update.patch, update.expectedUpdatedAt)
  return saved === undefined ? fail('CONFLICT', TASK_CONFLICT) : ok(saved)
}

interface MoveInput {
  readonly taskId: Id
  readonly toStageId: Id
  readonly expectedUpdatedAt: number
  readonly beforeTaskId?: Id
  readonly afterTaskId?: Id
}
function parseMove(input: unknown): MoveInput | undefined {
  const value = objectInput(input)
  if (
    value === undefined ||
    typeof value['taskId'] !== 'string' ||
    typeof value['toStageId'] !== 'string' ||
    typeof value['expectedUpdatedAt'] !== 'number'
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
async function destinationFor(
  deps: WorkDeps,
  task: WorkTaskRecord,
  move: MoveInput,
): Promise<WorkResult<{ readonly category: string; readonly rank: string }>> {
  const destination = await destinationStage(deps, task.workflowId, move.toStageId)
  if (destination === undefined) return fail('VALIDATION', 'stage is not part of the task workflow')
  if (await hasBlockedCompletion(deps, task, destination.category))
    return fail('CONFLICT', 'parent task has open subtasks')
  return ok({ category: destination.category, rank: await rankForMove(deps, move) })
}

async function destinationStage(deps: WorkDeps, workflowId: Id, stageId: Id) {
  const workflow = await deps.repo.loadWorkflow(workflowId)
  return workflow?.stages.find((stage) => stage.id === stageId)
}

async function hasBlockedCompletion(deps: WorkDeps, task: WorkTaskRecord, category: string): Promise<boolean> {
  return category === 'done_success' && hasOpenChildren(await deps.repo.listChildren(task.id))
}

async function rankForMove(deps: WorkDeps, move: MoveInput): Promise<string> {
  const before = move.beforeTaskId === undefined ? undefined : await deps.repo.getTask(move.beforeTaskId)
  const after = move.afterTaskId === undefined ? undefined : await deps.repo.getTask(move.afterTaskId)
  return rankBetween(before?.rank, after?.rank)
}

/** Moves a task between stages and assigns a deterministic rank within the destination column. */
export async function moveTask(deps: WorkDeps, input: unknown): Promise<WorkResult<WorkTaskRecord>> {
  const move = parseMove(input)
  if (move === undefined) return fail('VALIDATION', 'taskId, toStageId and expectedUpdatedAt are required')
  const task = await deps.repo.getTask(move.taskId)
  if (task === undefined) return fail('NOT_FOUND', TASK_NOT_FOUND)
  if (!allowed(deps, task)) return fail('FORBIDDEN', 'not allowed to update this task')
  const destination = await destinationFor(deps, task, move)
  if (!destination.ok) return destination
  const current = await moveToStage(deps, task, move)
  if (!current.ok) return current
  const patch: Partial<TaskDraft> = {
    rank: destination.value.rank,
    completedAt: destination.value.category === 'done_success' ? deps.clock.now() : null,
  }
  const saved = await deps.repo.updateTask(task.id, patch, current.value.updatedAt)
  return saved === undefined ? fail('CONFLICT', TASK_CONFLICT) : ok(saved)
}

async function moveToStage(deps: WorkDeps, task: WorkTaskRecord, move: MoveInput): Promise<WorkResult<WorkTaskRecord>> {
  if (task.stageId === move.toStageId) return ok(task)
  const changed = await changeStage(
    { actor: deps.actor, can: deps.can, store: deps.repo, uow: deps.uow, clock: deps.clock },
    { record: { type: 'task', id: task.id }, toStageId: move.toStageId, expectedUpdatedAt: move.expectedUpdatedAt },
  )
  if (!changed.ok) return err(changed.error)
  const current = await deps.repo.getTask(task.id)
  return current === undefined ? fail('NOT_FOUND', 'task disappeared during stage update') : ok(current)
}

/** Completes a task, respecting the open-subtask invariant. */
export async function completeTask(
  deps: WorkDeps,
  taskId: Id,
  expectedUpdatedAt: number,
): Promise<WorkResult<WorkTaskRecord>> {
  const task = await deps.repo.getTask(taskId)
  if (task === undefined) return fail('NOT_FOUND', TASK_NOT_FOUND)
  const workflow = await deps.repo.loadWorkflow(task.workflowId)
  const done = workflow?.stages.find((stage) => stage.category === 'done_success')
  return done === undefined
    ? fail('VALIDATION', 'task workflow has no completed stage')
    : moveTask(deps, { taskId, toStageId: done.id, expectedUpdatedAt })
}

/** Reopens a completed task into the workflow default stage. */
export async function reopenTask(
  deps: WorkDeps,
  taskId: Id,
  expectedUpdatedAt: number,
): Promise<WorkResult<WorkTaskRecord>> {
  const task = await deps.repo.getTask(taskId)
  if (task === undefined) return fail('NOT_FOUND', TASK_NOT_FOUND)
  const workflow = await deps.repo.loadWorkflow(task.workflowId)
  return workflow === undefined
    ? fail('NOT_FOUND', 'task workflow not found')
    : moveTask(deps, { taskId, toStageId: workflow.defaultStageId, expectedUpdatedAt })
}

/** Persists only dates through the repository's compare-and-set path. */
export async function setTaskDates(
  deps: WorkDeps,
  input: {
    readonly taskId: Id
    readonly startAt: number | null
    readonly dueAt: number | null
    readonly expectedUpdatedAt: number
  },
): Promise<WorkResult<WorkTaskRecord>> {
  const task = await deps.repo.getTask(input.taskId)
  if (task === undefined) return fail('NOT_FOUND', TASK_NOT_FOUND)
  if (!allowed(deps, task)) return fail('FORBIDDEN', 'not allowed to update this task')
  const saved = await deps.repo.updateTask(
    input.taskId,
    { startAt: input.startAt, dueAt: input.dueAt },
    input.expectedUpdatedAt,
  )
  return saved === undefined ? fail('CONFLICT', TASK_CONFLICT) : ok(saved)
}

/** Returns evenly spaced ranks for a destination column after a reorder. */
export function ranksForOrder(tasks: readonly WorkTaskRecord[]): ReadonlyMap<string, string> {
  return rebalanceRanks(tasks.map((task) => task.id))
}
