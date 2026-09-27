import { deleteGroup, saveGroup } from '@ops/module-identity'
import { contractBody } from '../../../../../server/api/contracts'
import { apiRoute } from '../../../../../server/api/http'
import { identityDeps } from '@/server/container'

export const dynamic = 'force-dynamic'

/** `groups.update` */
export const PATCH = apiRoute<{ id: string }>(async ({ request, params, context }) => {
  const body = await contractBody(request, 'groups.update')
  return body.ok ? saveGroup(await identityDeps(context), { ...body.value, id: params.id }) : body
})

/** `groups.delete` */
export const DELETE = apiRoute<{ id: string }>(async ({ params, context }) =>
  deleteGroup(await identityDeps(context), { id: params.id }),
)
