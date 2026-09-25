import { asId, err, invalidInput, ok, type Id } from '@ops/kernel'
import type { TaskDraft, TaskPatch, WorkResult } from '../ports/work'
import { createTaskSchema, updateTaskSchema, type TaskPatchInput } from '../schema'

/** A validated create input with every optional field resolved to its concrete default. */
export type ParsedTaskDraft = TaskDraft & {
  readonly description: string | null
  readonly projectId: Id | null
  readonly parentTaskId: Id | null
  readonly assigneeIds: readonly Id[]
  readonly groupId: Id | null
  readonly relatedType: string | null
  readonly relatedId: Id | null
  readonly startAt: number | null
  readonly dueAt: number | null
}

/** A validated `updateTask` input. */
export interface ParsedTaskUpdate {
  readonly taskId: Id
  readonly expectedUpdatedAt: number
  readonly patch: TaskPatch
}

const idOrNull = (value: string | null | undefined): Id | null =>
  value === null || value === undefined ? null : asId(value)

/** Parses untrusted task-create input; a failure names each invalid field. */
export function parseCreate(input: unknown): WorkResult<ParsedTaskDraft> {
  const parsed = createTaskSchema.safeParse(input)
  if (!parsed.success) return err(invalidInput('task fields are invalid', parsed.error.issues))
  const value = parsed.data
  return ok({
    title: value.title,
    description: value.description ?? null,
    projectId: idOrNull(value.projectId),
    parentTaskId: idOrNull(value.parentTaskId),
    assigneeIds: (value.assigneeIds ?? []).map(asId),
    groupId: idOrNull(value.groupId),
    priority: value.priority ?? 'none',
    relatedType: value.relatedType ?? null,
    relatedId: idOrNull(value.relatedId),
    startAt: value.startAt ?? null,
    dueAt: value.dueAt ?? null,
  })
}

/** Maps a validated patch to the port shape, keeping only the keys the caller sent. */
function taskPatch(patch: TaskPatchInput): TaskPatch {
  const { assigneeIds, groupId, relatedId, ...plain } = patch
  const copied = Object.fromEntries(Object.entries(plain).filter(([, value]) => value !== undefined))
  return {
    ...(copied as Pick<TaskPatch, 'title' | 'description' | 'priority' | 'relatedType'>),
    ...(assigneeIds === undefined ? {} : { assigneeIds: assigneeIds.map(asId) }),
    ...(groupId === undefined ? {} : { groupId: idOrNull(groupId) }),
    ...(relatedId === undefined ? {} : { relatedId: idOrNull(relatedId) }),
  }
}

/** Parses untrusted `updateTask` input; a failure names each invalid field. */
export function parseUpdate(input: unknown): WorkResult<ParsedTaskUpdate> {
  const parsed = updateTaskSchema.safeParse(input)
  if (!parsed.success) return err(invalidInput('task patch is invalid', parsed.error.issues))
  const { taskId, expectedUpdatedAt, patch } = parsed.data
  return ok({ taskId: asId(taskId), expectedUpdatedAt, patch: taskPatch(patch) })
}
