'use server'

import { archiveWork, restoreWork } from '@ops/module-work'
import { revalidatePath } from 'next/cache'
import { toActionResult, type ActionResult } from '../../action-result'
import { workCommandDeps } from '../../container'

const LIST_PATHS = { task: '/tasks', project: '/projects' } as const

/** Archives a task or project (owners and managers only) and refreshes its list. */
export async function archiveWorkAction(input: unknown): Promise<ActionResult<unknown>> {
  const result = await archiveWork(await workCommandDeps(), input)
  if (result.ok) revalidatePath(LIST_PATHS[result.value.type])
  return toActionResult(result)
}

/** Brings an archived task or project back (owners and managers only) and refreshes its list and the archive screen. */
export async function restoreWorkAction(input: unknown): Promise<ActionResult<unknown>> {
  const result = await restoreWork(await workCommandDeps(), input)
  if (result.ok) {
    revalidatePath(LIST_PATHS[result.value.type])
    revalidatePath('/settings/archive')
  }
  return toActionResult(result)
}
