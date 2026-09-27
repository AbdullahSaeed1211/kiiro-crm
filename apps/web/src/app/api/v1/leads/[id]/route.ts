import { asId, domainError, err, ok } from '@ops/kernel'
import { updateLead } from '@ops/module-crm'
import { contractBody } from '../../../../../server/api/contracts'
import { apiRoute } from '../../../../../server/api/http'
import { crmDeps } from '@/server/container'

export const dynamic = 'force-dynamic'

/** `leads.get` */
export const GET = apiRoute<{ id: string }>(async ({ params, context }) => {
  const record = await (await crmDeps(context)).repo.get('lead', asId(params.id))
  return record === undefined ? err(domainError('NOT_FOUND', 'lead not found')) : ok(record)
})

/** `leads.update` */
export const PATCH = apiRoute<{ id: string }>(async ({ request, params, context }) => {
  const body = await contractBody(request, 'leads.update')
  return body.ok ? updateLead(await crmDeps(context), { ...body.value, id: params.id }) : body
})
