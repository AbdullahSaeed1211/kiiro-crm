'use server'

import { createProject as createProjectCommand } from '@ops/module-work'
import { revalidatePath } from 'next/cache'
import { workCommandDeps } from '@/server/container'

export async function createProject(input: unknown) {
  const result = await createProjectCommand(await workCommandDeps(), input)
  if (result.ok) revalidatePath('/projects')
  return result.ok ? { ok: true as const, data: { id: result.value.id } } : { ok: false as const, error: result.error }
}
