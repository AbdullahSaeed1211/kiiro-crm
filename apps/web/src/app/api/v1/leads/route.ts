import { createLead } from '@ops/module-crm'
import { contractBody } from '../../../../server/api/contracts'
import { apiRoute } from '../../../../server/api/http'
import { listRecords } from '../../../../server/queries/crm/list-records'
import { crmDeps } from '@/server/container'

export const dynamic = 'force-dynamic'

/** `leads.list` */
export const GET = apiRoute(async ({ request, context }) => listRecords(context, 'lead', new URL(request.url)))

/** `leads.create` */
export const POST = apiRoute(async ({ request, context }) => {
  const body = await contractBody(request, 'leads.create')
  return body.ok ? createLead(await crmDeps(context), body.value) : body
}, 201)
