import { convertLead } from '@ops/module-crm'
import { contractBody } from '../../../../../../server/api/contracts'
import { apiRoute } from '../../../../../../server/api/http'
import { crmDeps } from '@/server/container'

export const dynamic = 'force-dynamic'

/** `leads.convert` */
export const POST = apiRoute<{ id: string }>(async ({ request, params, context }) => {
  const body = await contractBody(request, 'leads.convert')
  return body.ok ? convertLead(await crmDeps(context), { ...body.value, leadId: params.id }) : body
})
