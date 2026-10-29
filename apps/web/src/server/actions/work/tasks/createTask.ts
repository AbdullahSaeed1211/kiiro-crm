'use server'

import { createTask as createTaskCommand } from '@ops/module-work'
import { revalidateTaskViews } from './revalidate-task-views'
import { workCommandDeps } from '@/server/container'
import { getWorkspaceSettings } from '@/server/auth/context'
import { createTodayTask as createTodayTaskCommand } from '@ops/module-work'

export async function createTask(input: unknown) {
  const result = await createTaskCommand(await workCommandDeps(), input)
  if (result.ok) revalidateTaskViews()
  return result.ok ? { ok: true as const, data: { id: result.value.id } } : { ok: false as const, error: result.error }
}

/** Creates a task for the signed-in user due today in the workspace timezone. */
export async function createTodayTask(input: unknown) {
  const [deps, settings] = await Promise.all([workCommandDeps(), getWorkspaceSettings()])
  const timeZone = typeof settings.timezone === 'string' ? settings.timezone : 'UTC'
  const result = await createTodayTaskCommand(deps, input, timeZone)
  if (result.ok) revalidateTaskViews()
  return result.ok ? { ok: true as const, data: { id: result.value.id } } : { ok: false as const, error: result.error }
}
