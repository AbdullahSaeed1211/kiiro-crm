import { asId, domainError, err, ok } from '@ops/kernel'
import { updateScheduleItem } from '@ops/module-crm'
import { contractBody } from '@/server/api/contracts'
import { apiRoute } from '@/server/api/http'
import { crmDeps } from '@/server/container'

export const dynamic = 'force-dynamic'

/** `schedule.get`: repository reads are parent-scoped and single-record misses are not-found. */
export const GET = apiRoute<{ id: string }>(async ({ params, context }) => {
  const item = await (await crmDeps(context)).repo.getScheduleItem(asId(params.id))
  return item === undefined ? err(domainError('NOT_FOUND', 'Schedule item not found.')) : ok(item)
})

/** `schedule.update`: URL id is authoritative; the command verifies parent visibility and update permission. */
export const PATCH = apiRoute<{ id: string }>(async ({ request, params, context }) => {
  const body = await contractBody(request, 'schedule.update')
  return body.ok ? updateScheduleItem(await crmDeps(context), { ...body.value, id: params.id }) : body
})
