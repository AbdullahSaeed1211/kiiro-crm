import { asId, domainError, err, ok } from '@ops/kernel'
import { updateDeal } from '@ops/module-crm'
import { contractBody } from '../../../../../server/api/contracts'
import { apiRoute } from '../../../../../server/api/http'
import { crmDeps } from '@/server/container'

export const dynamic = 'force-dynamic'

/** `deals.get` */
export const GET = apiRoute<{ id: string }>(async ({ params, context }) => {
  const record = await (await crmDeps(context)).repo.get('deal', asId(params.id))
  return record === undefined ? err(domainError('NOT_FOUND', 'deal not found')) : ok(record)
})

/** `deals.update` */
export const PATCH = apiRoute<{ id: string }>(async ({ request, params, context }) => {
  const body = await contractBody(request, 'deals.update')
  return body.ok ? updateDeal(await crmDeps(context), { ...body.value, id: params.id }) : body
})
