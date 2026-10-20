'use server'

import { createTask as createTaskCommand } from '@ops/module-work'
import { revalidateTaskViews } from './revalidate-task-views'
import { workCommandDeps } from '@/server/container'

export async function createTask(input: unknown) {
  const result = await createTaskCommand(await workCommandDeps(), input)
  if (result.ok) revalidateTaskViews()
  return result.ok ? { ok: true as const, data: { id: result.value.id } } : { ok: false as const, error: result.error }
}
