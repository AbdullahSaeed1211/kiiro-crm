import { asId, domainError, err, ok } from '@ops/kernel'
import { updateProject } from '@ops/module-work'
import { contractBody } from '../../../../../server/api/contracts'
import { apiRoute } from '../../../../../server/api/http'
import { getWorkCommandDeps } from '../../../../../server/work/command-deps'

export const dynamic = 'force-dynamic'

/** `projects.get` */
export const GET = apiRoute<{ id: string }>(async ({ params, context }) => {
  const project = await (await getWorkCommandDeps(context)).repo.getProject(asId(params.id))
  return project === undefined ? err(domainError('NOT_FOUND', 'project not found')) : ok(project)
})

/** `projects.update` */
export const PATCH = apiRoute<{ id: string }>(async ({ request, params, context }) => {
  const body = await contractBody(request, 'projects.update')
  return body.ok ? updateProject(await getWorkCommandDeps(context), { ...body.value, projectId: params.id }) : body
})
