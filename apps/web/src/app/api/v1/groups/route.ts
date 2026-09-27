import { saveGroup } from '@ops/module-identity'
import { contractBody } from '../../../../server/api/contracts'
import { apiRoute } from '../../../../server/api/http'
import { identityDeps } from '@/server/container'

export const dynamic = 'force-dynamic'

/** `groups.create` */
export const POST = apiRoute(async ({ request, context }) => {
  const body = await contractBody(request, 'groups.create')
  return body.ok ? saveGroup(await identityDeps(context), body.value) : body
}, 201)
