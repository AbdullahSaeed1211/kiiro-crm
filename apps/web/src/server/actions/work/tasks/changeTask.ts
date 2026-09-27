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

function run({ taskId, expectedUpdatedAt, change }: TaskChangeRequest): Promise<Outcome> {
  switch (change.kind) {
    case 'stage':
      return moveTask({ taskId, toStageId: change.stageId, expectedUpdatedAt })
    case 'priority':
      return updateTask({ taskId, expectedUpdatedAt, patch: { priority: change.priority } })
    case 'assignees':
      return updateTask({ taskId, expectedUpdatedAt, patch: { assigneeIds: change.assigneeIds } })
    case 'description':
      return updateTask({ taskId, expectedUpdatedAt, patch: { description: change.description } })
    case 'dates':
      return setTaskDates({ taskId, startAt: change.startAt, dueAt: change.dueAt, expectedUpdatedAt })
    case 'complete':
      return change.reopen ? reopenTask(taskId, expectedUpdatedAt) : completeTask(taskId, expectedUpdatedAt)
  }
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
