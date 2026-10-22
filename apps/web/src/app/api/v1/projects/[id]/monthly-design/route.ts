import { asId, domainError, err, ok } from '@ops/kernel'
import { configureProjectMonthlyDesign } from '@ops/module-work'
import { contractBody } from '@/server/api/contracts'
import { apiRoute } from '@/server/api/http'
import { workCommandDeps } from '@/server/container'

export const dynamic = 'force-dynamic'

/** `projects.monthlyDesign.get` */
export const GET = apiRoute<{ id: string }>(async ({ params, context }) => {
  const project = await (await workCommandDeps(context)).repo.getProject(asId(params.id))
  return project === undefined
    ? err(domainError('NOT_FOUND', 'project not found'))
    : ok({ config: project.monthlyDesign, updatedAt: project.updatedAt })
})

/** `projects.monthlyDesign.configure` */
export const PATCH = apiRoute<{ id: string }>(async ({ request, params, context }) => {
  const body = await contractBody(request, 'projects.monthlyDesign.configure')
  return body.ok
    ? configureProjectMonthlyDesign(await workCommandDeps(context), { ...body.value, projectId: params.id })
    : body
})
