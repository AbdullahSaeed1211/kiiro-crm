import { asId, err, invalidInput, ok, type Id } from '@ops/kernel'
import type { z } from 'zod'
import type { TaskDraft, TaskPatch, WorkResult } from '../ports/work'
import { createTaskSchema, updateTaskSchema, type TaskPatchInput } from '../schema'

/** A validated create input with every optional field resolved to its concrete default. */
export type ParsedTaskDraft = TaskDraft & {
  readonly description: string | null
  readonly projectId: Id | null
  readonly parentTaskId: Id | null
  readonly assigneeIds: readonly Id[]
  readonly primaryAssigneeId: Id | null
  readonly primaryAssigneeProvided: boolean
  readonly collaboratorIds: readonly Id[]
  readonly watcherIds: readonly Id[]
  readonly blockedReason: string | null
  readonly waitingOnId: Id | null
  readonly groupId: Id | null
  readonly relatedType: string | null
  readonly relatedId: Id | null
  readonly startAt: number | null
  readonly dueAt: number | null
  readonly ownerOnly: boolean
}

/** A validated `updateTask` input. */
export interface ParsedTaskUpdate {
  readonly taskId: Id
  readonly expectedUpdatedAt: number
  readonly patch: TaskPatch
}

const idOrNull = (value: string | null | undefined): Id | null =>
  value === null || value === undefined ? null : asId(value)

type CreateInput = z.infer<typeof createTaskSchema>

function createIdentity(value: CreateInput) {
  return {
    title: value.title,
    description: value.description ?? null,
    projectId: idOrNull(value.projectId),
    parentTaskId: idOrNull(value.parentTaskId),
  }
}

function primaryAssignee(value: CreateInput): Id | null {
  if (value.primaryAssigneeId !== undefined) return idOrNull(value.primaryAssigneeId)
  const firstLegacy = value.assigneeIds?.[0]
  return firstLegacy === undefined ? null : asId(firstLegacy)
}

function taskParticipants(value: CreateInput) {
  return {
    assigneeIds: (value.assigneeIds ?? []).map(asId),
    primaryAssigneeId: primaryAssignee(value),
    primaryAssigneeProvided: value.primaryAssigneeId !== undefined,
    collaboratorIds: (value.collaboratorIds ?? value.assigneeIds?.slice(1) ?? []).map(asId),
    watcherIds: (value.watcherIds ?? []).map(asId),
    blockedReason: value.blockedReason?.trim() ?? null,
  }
}

function taskRelations(value: CreateInput) {
  return {
    waitingOnId: idOrNull(value.waitingOnId),
    groupId: idOrNull(value.groupId),
    relatedType: value.relatedType ?? null,
    relatedId: idOrNull(value.relatedId),
  }
}

const identity = (value: CreateInput) => ({
  ...createIdentity(value),
  ...taskParticipants(value),
  ...taskRelations(value),
})

const schedule = (value: CreateInput) => ({
  priority: value.priority ?? 'none',
  repeat: value.repeat ?? 'none',
  startAt: value.startAt ?? null,
  dueAt: value.dueAt ?? null,
  ownerOnly: value.ownerOnly ?? false,
})

/** Parses untrusted task-create input; a failure names each invalid field. */
export function parseCreate(input: unknown): WorkResult<ParsedTaskDraft> {
  const parsed = createTaskSchema.safeParse(input)
  if (!parsed.success) return err(invalidInput('task fields are invalid', parsed.error.issues))
  const value = parsed.data
  return ok({ ...identity(value), ...schedule(value) })
}

/** Maps a validated patch to the port shape, keeping only the keys the caller sent. */
function taskParticipantPatch(patch: TaskPatchInput): Partial<TaskPatch> {
  return {
    ...(patch.assigneeIds === undefined ? {} : { assigneeIds: patch.assigneeIds.map(asId) }),
    ...(patch.primaryAssigneeId === undefined ? {} : { primaryAssigneeId: idOrNull(patch.primaryAssigneeId) }),
    ...(patch.collaboratorIds === undefined ? {} : { collaboratorIds: patch.collaboratorIds.map(asId) }),
    ...(patch.watcherIds === undefined ? {} : { watcherIds: patch.watcherIds.map(asId) }),
    ...(patch.blockedReason === undefined ? {} : { blockedReason: patch.blockedReason }),
    ...(patch.waitingOnId === undefined ? {} : { waitingOnId: idOrNull(patch.waitingOnId) }),
  }
}

function taskPatch(patch: TaskPatchInput): TaskPatch {
  const { groupId, relatedId, ...plain } = patch
  const copied = Object.fromEntries(Object.entries(plain).filter(([, value]) => value !== undefined))
  return {
    ...(copied as Pick<TaskPatch, 'title' | 'description' | 'priority' | 'relatedType' | 'repeat' | 'ownerOnly'>),
    ...taskParticipantPatch(patch),
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
