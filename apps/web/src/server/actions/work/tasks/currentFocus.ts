'use server'

import { setCurrentFocus } from '@ops/module-work'
import { actionFailure, toActionResult } from '@/server/action-result'
import { workCommandDeps } from '@/server/container'
import { revalidateTaskViews } from './revalidate-task-views'

/** Starts or stops the signed-in person's explicit current task focus. */
export async function updateCurrentFocus(input: unknown) {
  try {
    const result = await setCurrentFocus(await workCommandDeps(), input)
    if (result.ok) revalidateTaskViews(result.value.taskId ?? undefined)
    return toActionResult(result)
  } catch (error) {
    return actionFailure(error, 'work.currentFocus', 'Could not update current work. Try again.')
  }
}
