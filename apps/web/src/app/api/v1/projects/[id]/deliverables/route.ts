import { createDeliverable } from '@ops/module-work'
import { asId } from '@ops/kernel'
import { contractBody } from '@/server/api/contracts'
import { apiRoute } from '@/server/api/http'
import { workCommandDeps } from '@/server/container'

export const dynamic = 'force-dynamic'
export const POST = apiRoute<{ id: string }>(async ({ request, params, context }) => {
  const body = await contractBody(request, 'projects.deliverables.create')
  return body.ok
    ? createDeliverable(await workCommandDeps(context), { ...body.value, projectId: asId(params.id) })
    : body
}, 201)
