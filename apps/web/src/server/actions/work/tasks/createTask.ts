'use server'

import { createTask as createTaskCommand } from '@ops/module-work'
import { revalidatePath } from 'next/cache'
import { workCommandDeps } from '@/server/container'

export async function createTask(input: unknown) {
  const result = await createTaskCommand(await workCommandDeps(), input)
  if (result.ok) {
    revalidatePath('/tasks')
    revalidatePath('/my-tasks')
  }
  return result.ok ? { ok: true as const, data: { id: result.value.id } } : { ok: false as const, error: result.error }
}
