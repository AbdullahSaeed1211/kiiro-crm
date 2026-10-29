'use server'

import { addTaskToTodayPlan, removeTaskFromTodayPlan } from '@ops/module-work'
import { getWorkspaceSettings } from '@/server/auth/context'
import { workCommandDeps } from '@/server/container'
import { revalidateTaskViews } from './revalidate-task-views'

function workspaceTimeZone(settings: Awaited<ReturnType<typeof getWorkspaceSettings>>): string {
  return typeof settings.timezone === 'string' ? settings.timezone : 'UTC'
}

/** Adds the signed-in assignee's personal plan entry for today without changing the task. */
export async function addTaskToPlan(taskId: string) {
  const [deps, settings] = await Promise.all([workCommandDeps(), getWorkspaceSettings()])
  const result = await addTaskToTodayPlan(deps, { taskId }, workspaceTimeZone(settings))
  if (result.ok) revalidateTaskViews(taskId)
  return result
}

/** Removes only the signed-in person's plan entry for today. */
export async function removeTaskFromPlan(taskId: string) {
  const [deps, settings] = await Promise.all([workCommandDeps(), getWorkspaceSettings()])
  const result = await removeTaskFromTodayPlan(deps, { taskId }, workspaceTimeZone(settings))
  if (result.ok) revalidateTaskViews(taskId)
  return result
}
