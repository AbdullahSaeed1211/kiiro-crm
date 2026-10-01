'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { actionError, actionFailure, actionOk, type ActionResult } from '../../../action-result'
import { getProductContext } from '../../../auth/context'
import { parseDuration } from '../../../time/duration'
import { addTaskTime, removeTaskTime } from '../../../time/entries'

const DAY_MS = 86_400_000
const logSchema = z
  .object({
    taskId: z.string().min(1).max(64),
    duration: z.string().trim().min(1).max(30),
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
    note: z.string().trim().max(500),
  })
  .strict()
const removeSchema = z.object({ entryId: z.string().min(1).max(64), taskId: z.string().min(1).max(64) }).strict()

// Only these actions are exported: every export of a 'use server' file becomes callable from the client.
/** Logs time on a task for the signed-in user, from a typed duration such as `1h 30m` and a day. */
export async function logTime(input: unknown): Promise<ActionResult> {
  const parsed = logSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION', 'Enter a time such as 1h 30m, a day and an optional note.')
  const minutes = parseDuration(parsed.data.duration)
  const day = Date.parse(`${parsed.data.day}T00:00:00.000Z`)
  if (minutes === null) return actionError('VALIDATION', 'Enter a time between 1 minute and 24 hours, such as 1h 30m.')
  if (!Number.isFinite(day) || day > Date.now() + DAY_MS)
    return actionError('VALIDATION', 'Choose a day that is not in the future.')
  try {
    const saved = await addTaskTime(await getProductContext(), {
      taskId: parsed.data.taskId,
      minutes,
      day,
      note: parsed.data.note,
    })
    if (!saved) return actionError('NOT_FOUND', 'That task is not available to you.')
    revalidatePath(`/tasks/${parsed.data.taskId}`)
    return actionOk()
  } catch (error) {
    return actionFailure(error, 'logTime', 'Unable to log the time.')
  }
}

/** Deletes one time entry the signed-in user may delete. */
export async function deleteTime(input: unknown): Promise<ActionResult> {
  const parsed = removeSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION', 'Choose an entry.')
  try {
    const removed = await removeTaskTime(await getProductContext(), parsed.data.entryId)
    if (!removed) return actionError('FORBIDDEN', 'You can only delete your own entries.')
    revalidatePath(`/tasks/${parsed.data.taskId}`)
    return actionOk()
  } catch (error) {
    return actionFailure(error, 'deleteTime', 'Unable to delete the entry.')
  }
}
