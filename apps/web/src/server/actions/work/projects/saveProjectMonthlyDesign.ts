'use server'

import { configureProjectMonthlyDesign } from '@ops/module-work'
import { revalidatePath } from 'next/cache'
import { actionFailure, toActionResult } from '@/server/action-result'
import { workCommandDeps } from '@/server/container'

export async function saveProjectMonthlyDesign(input: unknown) {
  try {
    const result = await configureProjectMonthlyDesign(await workCommandDeps(), input)
    if (result.ok) {
      const projectId =
        typeof input === 'object' && input !== null && 'projectId' in input && typeof input.projectId === 'string'
          ? input.projectId
          : undefined
      if (typeof projectId === 'string') revalidatePath(`/projects/${projectId}`)
    }
    return toActionResult(result)
  } catch (error) {
    return actionFailure(error, 'save monthly design settings', 'The monthly design settings could not be saved.')
  }
}
