'use server'

import { removeProjectMember as removeMemberCommand } from '@ops/module-work'
import { asId } from '@ops/kernel'
import { revalidatePath } from 'next/cache'
import { workCommandDeps } from '@/server/container'
import { updatedAtResult } from '../updated-at-result'

export async function removeProjectMember(projectId: string, memberId: string, expectedUpdatedAt: number) {
  const result = await removeMemberCommand(await workCommandDeps(), {
    projectId: asId(projectId),
    memberId: asId(memberId),
    expectedUpdatedAt,
  })
  if (result.ok) revalidatePath(`/projects/${projectId}`)
  return updatedAtResult(result)
}
