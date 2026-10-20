'use server'

import { updateTask as updateTaskCommand } from '@ops/module-work'
import { revalidateTaskViews } from './revalidate-task-views'
import { workCommandDeps } from '@/server/container'

export async function updateTask(input: unknown) {
  const result = await updateTaskCommand(await workCommandDeps(), input)
  if (result.ok) revalidateTaskViews(result.value.id)
  return result.ok
    ? { ok: true as const, data: { id: result.value.id, updatedAt: result.value.updatedAt } }
    : { ok: false as const, error: result.error }
}
