import { moveDeal } from '@ops/module-crm'
import { contractBody } from '../../../../../../server/api/contracts'
import { apiRoute } from '../../../../../../server/api/http'
import { crmDeps } from '@/server/container'

export const dynamic = 'force-dynamic'

/** `deals.move` */
export const POST = apiRoute<{ id: string }>(async ({ request, params, context }) => {
  const body = await contractBody(request, 'deals.move')
  return body.ok ? moveDeal(await crmDeps(context), { ...body.value, dealId: params.id }) : body
})
