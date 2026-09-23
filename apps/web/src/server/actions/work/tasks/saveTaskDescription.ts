'use server'

import { revalidatePath } from 'next/cache'
import { updateTask } from './updateTask'

async function runSaveTaskDescription(taskId: string, expectedUpdatedAt: number, description: string) {
  const result = await updateTask({
    taskId,
    expectedUpdatedAt,
    patch: { description },
  })
  if (result.ok) revalidatePath(`/tasks/${taskId}`)
  return result.ok
    ? { ok: true as const, data: { updatedAt: result.data.updatedAt } }
    : { ok: false as const, error: result.error }
}

/** Adapter for TaskSheet's inline save contract. */
export async function saveTaskDescriptionForSheet(taskId: string, expectedUpdatedAt: number, description: string) {
  const result = await runSaveTaskDescription(taskId, expectedUpdatedAt, description)
  return result.ok ? { ok: true as const } : { ok: false as const, error: result.error.message }
}
