'use server'

import { completeTask as completeTaskCommand } from '@ops/module-work'
import { asId } from '@ops/kernel'
import { revalidateTaskViews } from './revalidate-task-views'
import { workCommandDeps } from '@/server/container'
import { updatedAtResult } from '../updated-at-result'

export async function completeTask(taskId: string, expectedUpdatedAt: number) {
  const result = await completeTaskCommand(await workCommandDeps(), asId(taskId), expectedUpdatedAt)
  if (result.ok) revalidateTaskViews(taskId)
  return updatedAtResult(result)
}
