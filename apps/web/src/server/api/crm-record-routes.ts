import { asId, domainError, err, ok, type Result } from '@ops/kernel'
import { markLost, type CrmDeps } from '@ops/module-crm'
import { crmDeps } from '../container'
import { contractBody } from './contracts'
import { apiRoute } from './http'

type Update = (deps: CrmDeps, input: unknown) => Promise<Result<unknown>>

/** `GET` and `PATCH` for one CRM record type at `/api/v1/<noun>/[id]`, from its contract ids and update use case. */
export function crmRecordRoutes(input: {
  readonly noun: 'contacts' | 'deals' | 'leads' | 'organizations'
  readonly type: 'contact' | 'deal' | 'lead' | 'organization'
  readonly update: Update
}) {
  const { noun, type, update } = input
  return {
    GET: apiRoute<{ id: string }>(async ({ params, context }) => {
      const record = await (await crmDeps(context)).repo.get(type, asId(params.id))
      return record === undefined ? err(domainError('NOT_FOUND', `${type} not found`)) : ok(record)
    }),
    PATCH: apiRoute<{ id: string }>(async ({ request, params, context }) => {
      const body = await contractBody(request, `${noun}.update`)
      return body.ok ? update(await crmDeps(context), { ...body.value, id: params.id }) : body
    }),
  }
}

/** `POST /api/v1/<noun>/[id]/lost`: marks a lead or deal lost with a reason. */
export function lostRoute(noun: 'deals' | 'leads') {
  return apiRoute<{ id: string }>(async ({ request, params, context }) => {
    const body = await contractBody(request, `${noun}.lost`)
    return body.ok ? markLost(await crmDeps(context), { ...body.value, id: params.id }) : body
  })
}
