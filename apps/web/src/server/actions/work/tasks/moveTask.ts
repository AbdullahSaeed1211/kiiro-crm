'use server'

import { revalidateTaskViews } from './revalidate-task-views'
import { moveTask as moveTaskCommand } from '@ops/module-work'
import { workCommandDeps } from '@/server/container'
import type { MoveTaskResult } from '../../../work/move-task'

// Only this action is exported: every export of a 'use server' file becomes callable from the client.
/** Server action behind board drops and the "Move to…" menu. */
export async function moveTask(input: unknown): Promise<MoveTaskResult> {
  const result = await moveTaskCommand(await workCommandDeps(), input)
  if (result.ok) revalidateTaskViews(result.value.id)
  return result.ok
    ? { ok: true as const, data: { stageId: result.value.stageId, updatedAt: result.value.updatedAt } }
    : ({ ok: false as const, error: result.error } satisfies MoveTaskResult)
}
