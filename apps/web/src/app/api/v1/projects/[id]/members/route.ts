import { asId } from '@ops/kernel'
import { addProjectMember } from '@ops/module-work'
import { contractBody } from '../../../../../../server/api/contracts'
import { apiRoute } from '../../../../../../server/api/http'
import { getWorkCommandDeps } from '../../../../../../server/work/command-deps'

export const dynamic = 'force-dynamic'

/** `projects.members.add` */
export const POST = apiRoute<{ id: string }>(async ({ request, params, context }) => {
  const body = await contractBody(request, 'projects.members.add')
  if (!body.ok) return body
  const { memberId, expectedUpdatedAt } = body.value
  return addProjectMember(await getWorkCommandDeps(context), {
    projectId: asId(params.id),
    memberId: asId(memberId),
    expectedUpdatedAt,
  })
})
