'use server'

import { revalidatePath } from 'next/cache'
import { setTaskDates } from '@ops/module-work'
import { asId } from '@ops/kernel'
import { z } from 'zod'
import { workCommandDeps } from '@/server/container'
import { actionError, actionOk, type ActionResult } from '../../../action-result'

const DAY_MS = 86_400_000
const dayKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u)
const timeOrNull = z.number().int().min(0).nullable()

const moveSchema = z
  .object({
    taskId: z.string().min(1),
    from: dayKey,
    to: dayKey,
    dueAt: z.number().int().min(0),
    startAt: timeOrNull,
    updatedAt: z.number().int().min(0),
  })
  .strict()

/** Moves a task to another day on the calendar by shifting its due date, and its start date by the same days. */
export async function rescheduleTask(input: unknown): Promise<ActionResult> {
  const parsed = moveSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION', 'That move is not valid.')
  const { taskId, from, to, dueAt, startAt, updatedAt } = parsed.data
  const days = Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS)
  const result = await setTaskDates(await workCommandDeps(), {
    taskId: asId(taskId),
    startAt: startAt === null ? null : startAt + days * DAY_MS,
    dueAt: dueAt + days * DAY_MS,
    expectedUpdatedAt: updatedAt,
  })
  if (!result.ok) return actionError(result.error.code, result.error.message)
  revalidatePath('/calendar')
  revalidatePath('/timeline')
  return actionOk()
}
