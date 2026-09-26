'use server'

import { updateTask as updateTaskCommand } from '@ops/module-work'
import { revalidatePath } from 'next/cache'
import { workCommandDeps } from '@/server/container'

export async function updateTask(input: unknown) {
  const result = await updateTaskCommand(await workCommandDeps(), input)
  if (result.ok) {
    revalidatePath('/tasks')
    revalidatePath('/tasks/board')
    revalidatePath(`/tasks/${result.value.id}`)
    revalidatePath('/my-tasks')
    revalidatePath('/calendar')
    revalidatePath('/timeline')
    revalidatePath('/')
  }
  return result.ok
    ? { ok: true as const, data: { id: result.value.id, updatedAt: result.value.updatedAt } }
    : { ok: false as const, error: result.error }
}
