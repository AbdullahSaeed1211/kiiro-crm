import { moveLead } from '@ops/module-crm'
import { contractBody } from '../../../../../../server/api/contracts'
import { apiRoute } from '../../../../../../server/api/http'
import { crmDeps } from '@/server/container'

export const dynamic = 'force-dynamic'

/** `leads.move` */
export const POST = apiRoute<{ id: string }>(async ({ request, params, context }) => {
  const body = await contractBody(request, 'leads.move')
  return body.ok ? moveLead(await crmDeps(context), { ...body.value, leadId: params.id }) : body
})
