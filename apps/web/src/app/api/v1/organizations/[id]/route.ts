import { asId, domainError, err, ok } from '@ops/kernel'
import { updateOrganization } from '@ops/module-crm'
import { contractBody } from '../../../../../server/api/contracts'
import { apiRoute } from '../../../../../server/api/http'
import { crmDeps } from '@/server/container'

export const dynamic = 'force-dynamic'

/** `organizations.get` */
export const GET = apiRoute<{ id: string }>(async ({ params, context }) => {
  const record = await (await crmDeps(context)).repo.get('organization', asId(params.id))
  return record === undefined ? err(domainError('NOT_FOUND', 'organization not found')) : ok(record)
})

/** `organizations.update` */
export const PATCH = apiRoute<{ id: string }>(async ({ request, params, context }) => {
  const body = await contractBody(request, 'organizations.update')
  return body.ok ? updateOrganization(await crmDeps(context), { ...body.value, id: params.id }) : body
})
