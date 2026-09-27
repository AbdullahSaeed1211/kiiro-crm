import { saveMember } from '@ops/module-identity'
import { contractBody } from '../../../../../server/api/contracts'
import { apiRoute } from '../../../../../server/api/http'
import { identityDeps } from '@/server/container'

export const dynamic = 'force-dynamic'

/** `members.update` */
export const PATCH = apiRoute<{ id: string }>(async ({ request, params, context }) => {
  const body = await contractBody(request, 'members.update')
  return body.ok ? saveMember(await identityDeps(context), { ...body.value, id: params.id }) : body
})
