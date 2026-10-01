'use server'

import type { DomainError } from '@ops/kernel'
import type { TaskChangeRequest, TaskChangeResult } from '@ops/ui/composites/TaskSheet'
import { revalidatePath } from 'next/cache'
import { completeTask } from './completeTask'
import { createTask } from './createTask'
import { moveTask } from './moveTask'
import { reopenTask } from './reopenTask'
import { setTaskDates } from './setTaskDates'
import { updateTask } from './updateTask'

type Outcome =
  Readonly<{ ok: true; data: Readonly<{ updatedAt?: number }> }> | Readonly<{ ok: false; error: DomainError }>

/** Field messages keyed by the input field, so `patch.priority` and `priority` both reach the priority control. */
function fieldsOf(error: DomainError): Record<string, string> | undefined {
  const fields = error.details?.fields
  if (typeof fields !== 'object' || fields === null) return undefined
  const entries = Object.entries(fields).flatMap(([key, value]) =>
    typeof value === 'string' ? [[key.split('.').at(-1) ?? key, value] as const] : [],
  )
  return entries.length === 0 ? undefined : Object.fromEntries(entries)
}

function toResult(outcome: Outcome, taskId: string): TaskChangeResult {
  if (!outcome.ok) {
    const fields = fieldsOf(outcome.error)
    return { ok: false, message: outcome.error.message, ...(fields === undefined ? {} : { fields }) }
  }
  revalidatePath(`/tasks/${taskId}`)
  return outcome.data.updatedAt === undefined ? { ok: true } : { ok: true, updatedAt: outcome.data.updatedAt }
}

/** The task patch for the changes that only edit a field, or `undefined` for the ones with their own command. */
function fieldPatch(change: TaskChangeRequest['change']): Record<string, unknown> | undefined {
  if (change.kind === 'priority') return { priority: change.priority }
  if (change.kind === 'repeat') return { repeat: change.repeat }
  if (change.kind === 'assignees') return { assigneeIds: change.assigneeIds }
  if (change.kind === 'group') return { groupId: change.groupId }
  if (change.kind === 'description') return { description: change.description }
  return undefined
}

function run({ taskId, expectedUpdatedAt, change }: TaskChangeRequest): Promise<Outcome> {
  const patch = fieldPatch(change)
  if (patch !== undefined) return updateTask({ taskId, expectedUpdatedAt, patch })
  if (change.kind === 'stage') return moveTask({ taskId, toStageId: change.stageId, expectedUpdatedAt })
  if (change.kind === 'dates')
    return setTaskDates({ taskId, startAt: change.startAt, dueAt: change.dueAt, expectedUpdatedAt })
  if (change.kind === 'complete')
    return change.reopen ? reopenTask(taskId, expectedUpdatedAt) : completeTask(taskId, expectedUpdatedAt)
  return Promise.reject(new Error('unsupported task change'))
}

/** Server action behind every edit in the task panel and page; returns field errors for inline display. */
export async function changeTask(request: TaskChangeRequest): Promise<TaskChangeResult> {
  return toResult(await run(request), request.taskId)
}

/** Server action behind "Add subtask"; the depth limit comes back as a field error on `parentTaskId`. */
export async function createSubtask(parentTaskId: string, title: string): Promise<TaskChangeResult> {
  const outcome = await createTask({ title, parentTaskId })
  return toResult(outcome.ok ? { ok: true, data: {} } : outcome, parentTaskId)
}
