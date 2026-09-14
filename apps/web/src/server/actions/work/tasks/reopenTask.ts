'use server'

import { reopenTask as reopenTaskCommand } from '@ops/module-work'
import { asId } from '@ops/kernel'
import { revalidatePath } from 'next/cache'
import { getWorkCommandDeps } from '../../../work/command-deps'

export async function reopenTask(taskId: string, expectedUpdatedAt: number) {
  const result = await reopenTaskCommand(await getWorkCommandDeps(), asId(taskId), expectedUpdatedAt)
  if (result.ok) {
    revalidatePath('/tasks')
    revalidatePath(`/tasks/${taskId}`)
  }
  return result.ok
    ? { ok: true as const, data: { updatedAt: result.value.updatedAt } }
    : { ok: false as const, error: result.error }
}
