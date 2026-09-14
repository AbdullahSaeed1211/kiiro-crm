'use server'

import { createTask as createTaskCommand } from '@ops/module-work'
import { revalidatePath } from 'next/cache'
import { getWorkCommandDeps } from '../../../work/command-deps'

export async function createTask(input: unknown) {
  const result = await createTaskCommand(await getWorkCommandDeps(), input)
  if (result.ok) {
    revalidatePath('/tasks')
    revalidatePath('/my-tasks')
  }
  return result.ok ? { ok: true as const, data: { id: result.value.id } } : { ok: false as const, error: result.error }
}
