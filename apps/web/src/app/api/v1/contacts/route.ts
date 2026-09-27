import { createContact } from '@ops/module-crm'
import { contractBody } from '../../../../server/api/contracts'
import { apiRoute } from '../../../../server/api/http'
import { listRecords } from '../../../../server/queries/crm/list-records'
import { crmDeps } from '@/server/container'

export const dynamic = 'force-dynamic'

/** `contacts.list` */
export const GET = apiRoute(async ({ request, context }) => listRecords(context, 'contact', new URL(request.url)))

/** `contacts.create` */
export const POST = apiRoute(async ({ request, context }) => {
  const body = await contractBody(request, 'contacts.create')
  return body.ok ? createContact(await crmDeps(context), body.value) : body
}, 201)
