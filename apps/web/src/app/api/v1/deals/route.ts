import { createDeal } from '@ops/module-crm'
import { contractBody } from '../../../../server/api/contracts'
import { apiRoute } from '../../../../server/api/http'
import { listRecords } from '../../../../server/queries/crm/list-records'
import { crmDeps } from '@/server/container'

export const dynamic = 'force-dynamic'

/** `deals.list` */
export const GET = apiRoute(async ({ request, context }) => listRecords(context, 'deal', new URL(request.url)))

/** `deals.create` */
export const POST = apiRoute(async ({ request, context }) => {
  const body = await contractBody(request, 'deals.create')
  return body.ok ? createDeal(await crmDeps(context), body.value) : body
}, 201)
