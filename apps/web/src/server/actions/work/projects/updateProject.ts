'use server'

import { updateProject as updateProjectCommand } from '@ops/module-work'
import { revalidatePath } from 'next/cache'
import { workCommandDeps } from '@/server/container'

export async function updateProject(input: unknown) {
  const result = await updateProjectCommand(await workCommandDeps(), input)
  if (result.ok) revalidatePath(`/projects/${result.value.id}`)
  return result.ok
    ? { ok: true as const, data: { id: result.value.id, updatedAt: result.value.updatedAt } }
    : { ok: false as const, error: result.error }
}
