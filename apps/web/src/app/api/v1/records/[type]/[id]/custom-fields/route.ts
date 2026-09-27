import { setCustomFields } from '@ops/module-crm'
import { contractBody } from '../../../../../../../server/api/contracts'
import { apiRoute } from '../../../../../../../server/api/http'
import { crmDeps } from '@/server/container'

export const dynamic = 'force-dynamic'

/** `records.customFields` */
export const PATCH = apiRoute<{ type: string; id: string }>(async ({ request, params, context }) => {
  const body = await contractBody(request, 'records.customFields')
  return body.ok ? setCustomFields(await crmDeps(context), { ...body.value, type: params.type, id: params.id }) : body
})
