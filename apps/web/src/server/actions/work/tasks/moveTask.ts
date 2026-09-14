'use server'

import { revalidatePath } from 'next/cache'
import { moveTask as moveTaskCommand } from '@ops/module-work'
import { getWorkCommandDeps } from '../../../work/command-deps'
import type { MoveTaskResult } from '../../../work/move-task'

// Only this action is exported: every export of a 'use server' file becomes callable from the client.
/** Server action behind board drops and the "Move to…" menu. */
export async function moveTask(input: unknown): Promise<MoveTaskResult> {
  const result = await moveTaskCommand(await getWorkCommandDeps(), input)
  if (result.ok) {
    revalidatePath('/tasks/board')
    revalidatePath('/tasks')
  }
  return result.ok
    ? { ok: true as const, data: { stageId: result.value.stageId, updatedAt: result.value.updatedAt } }
    : ({ ok: false as const, error: result.error } satisfies MoveTaskResult)
}
