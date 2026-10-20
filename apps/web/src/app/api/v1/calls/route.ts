import { logCall } from '@ops/module-crm'
import { contractBody } from '@/server/api/contracts'
import { apiRoute } from '@/server/api/http'
import { crmDeps } from '@/server/container'

export const dynamic = 'force-dynamic'
export const POST = apiRoute(async ({ request, context }) => {
  const body = await contractBody(request, 'calls.create')
  return body.ok ? logCall(await crmDeps(context), body.value) : body
}, 201)
