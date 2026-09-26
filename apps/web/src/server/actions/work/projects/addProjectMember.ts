'use server'

import { addProjectMember as addMemberCommand } from '@ops/module-work'
import { asId } from '@ops/kernel'
import { revalidatePath } from 'next/cache'
import { workCommandDeps } from '@/server/container'

export async function addProjectMember(projectId: string, memberId: string, expectedUpdatedAt: number) {
  const result = await addMemberCommand(await workCommandDeps(), {
    projectId: asId(projectId),
    memberId: asId(memberId),
    expectedUpdatedAt,
  })
  if (result.ok) revalidatePath(`/projects/${projectId}`)
  return result.ok
    ? { ok: true as const, data: { updatedAt: result.value.updatedAt } }
    : { ok: false as const, error: result.error }
}
