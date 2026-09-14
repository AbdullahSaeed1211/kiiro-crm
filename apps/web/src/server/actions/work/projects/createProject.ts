'use server'

import { createProject as createProjectCommand } from '@ops/module-work'
import { revalidatePath } from 'next/cache'
import { getWorkCommandDeps } from '../../../work/command-deps'

export async function createProject(input: unknown) {
  const result = await createProjectCommand(await getWorkCommandDeps(), input)
  if (result.ok) revalidatePath('/projects')
  return result.ok ? { ok: true as const, data: { id: result.value.id } } : { ok: false as const, error: result.error }
}

export async function createProjectFromForm(formData: FormData) {
  const result = await createProject({ name: formData.get('name'), description: formData.get('description') ?? null })
  if (!result.ok) return
  const { redirect } = await import('next/navigation')
  redirect(`/projects/${result.data.id}`)
}
