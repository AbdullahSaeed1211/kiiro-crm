import { asId } from '@ops/kernel'
import { removeProjectMember } from '@ops/module-work'
import { contractBody } from '../../../../../../../server/api/contracts'
import { apiRoute } from '../../../../../../../server/api/http'
import { workCommandDeps } from '@/server/container'

export const dynamic = 'force-dynamic'

/** `projects.members.remove` */
export const DELETE = apiRoute<{ id: string; memberId: string }>(async ({ request, params, context }) => {
  const body = await contractBody(request, 'projects.members.remove')
  if (!body.ok) return body
  return removeProjectMember(await workCommandDeps(context), {
    projectId: asId(params.id),
    memberId: asId(params.memberId),
    expectedUpdatedAt: body.value.expectedUpdatedAt,
  })
})
