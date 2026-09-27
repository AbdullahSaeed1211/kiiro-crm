import { createOrganization } from '@ops/module-crm'
import { contractBody } from '../../../../server/api/contracts'
import { apiRoute } from '../../../../server/api/http'
import { listRecords } from '../../../../server/queries/crm/list-records'
import { crmDeps } from '@/server/container'

export const dynamic = 'force-dynamic'

/** `organizations.list` */
export const GET = apiRoute(async ({ request, context }) => listRecords(context, 'organization', new URL(request.url)))

/** `organizations.create` */
export const POST = apiRoute(async ({ request, context }) => {
  const body = await contractBody(request, 'organizations.create')
  return body.ok ? createOrganization(await crmDeps(context), body.value) : body
}, 201)
