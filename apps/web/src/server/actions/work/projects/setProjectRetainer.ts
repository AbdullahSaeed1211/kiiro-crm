'use server'

import { setProjectRetainer as setProjectRetainerCommand } from '@ops/module-work'
import { revalidatePath } from 'next/cache'
import { workCommandDeps } from '@/server/container'

export async function setProjectRetainer(input: unknown) {
  const result = await setProjectRetainerCommand(await workCommandDeps(), input)
  if (result.ok) revalidatePath(`/projects/${String(Reflect.get(input as object, 'projectId'))}`)
  return result.ok ? { ok: true as const, data: result.value } : { ok: false as const, error: result.error }
}
