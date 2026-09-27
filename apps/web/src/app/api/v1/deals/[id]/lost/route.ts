import { markLost } from '@ops/module-crm'
import { contractBody } from '../../../../../../server/api/contracts'
import { apiRoute } from '../../../../../../server/api/http'
import { crmDeps } from '@/server/container'

export const dynamic = 'force-dynamic'

/** `deals.lost` */
export const POST = apiRoute<{ id: string }>(async ({ request, params, context }) => {
  const body = await contractBody(request, 'deals.lost')
  return body.ok ? markLost(await crmDeps(context), { ...body.value, id: params.id }) : body
})
