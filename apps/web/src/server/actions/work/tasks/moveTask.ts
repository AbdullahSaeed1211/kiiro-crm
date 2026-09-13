'use server'

import { revalidatePath } from 'next/cache'
import { getWorkDeps } from '../../../work/deps'
import { runMoveTask, type MoveTaskResult } from '../../../work/move-task'

// Only this action is exported: every export of a 'use server' file becomes callable from the client.
/** Server action behind board drops and the "Move to…" menu. */
export async function moveTask(input: unknown): Promise<MoveTaskResult> {
  const result = await runMoveTask(await getWorkDeps(), input)
  if (result.ok) {
    revalidatePath('/tasks/board')
    revalidatePath('/tasks')
  }
  return result
}
