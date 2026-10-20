'use server'

import { reopenTask as reopenTaskCommand } from '@ops/module-work'
import { asId } from '@ops/kernel'
import { revalidateTaskViews } from './revalidate-task-views'
import { workCommandDeps } from '@/server/container'
import { updatedAtResult } from '../updated-at-result'

export async function reopenTask(taskId: string, expectedUpdatedAt: number) {
  const result = await reopenTaskCommand(await workCommandDeps(), asId(taskId), expectedUpdatedAt)
  if (result.ok) revalidateTaskViews(taskId)
  return updatedAtResult(result)
}
