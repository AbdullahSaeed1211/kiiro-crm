import { asId, domainError, err, ok, type Result } from '@ops/kernel'
import { markLost, type CrmDeps } from '@ops/module-crm'
import { crmDeps } from '../container'
import { listRecords } from '../queries/crm/list-records'
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

/** `GET` (list) and `POST` (create) for one CRM record type at `/api/v1/<noun>`. */
export function crmCollectionRoutes(input: {
  readonly noun: 'contacts' | 'deals' | 'leads' | 'organizations'
  readonly type: 'contact' | 'deal' | 'lead' | 'organization'
  readonly create: Update
}) {
  const { noun, type, create } = input
  return {
    GET: apiRoute(async ({ request, context }) => listRecords(context, type, new URL(request.url))),
    POST: apiRoute(async ({ request, context }) => {
      const body = await contractBody(request, `${noun}.create`)
      return body.ok ? create(await crmDeps(context), body.value) : body
    }, 201),
  }
}

/** `POST /api/v1/<noun>/[id]/<action>`: a body-carrying command on one record; `idKey` names where the URL id goes. */
export function crmActionRoute(input: {
  readonly contract: 'deals.move' | 'leads.convert' | 'leads.move'
  readonly idKey: 'dealId' | 'leadId'
  readonly run: Update
}) {
  const { contract, idKey, run } = input
  return apiRoute<{ id: string }>(async ({ request, params, context }) => {
    const body = await contractBody(request, contract)
    return body.ok ? run(await crmDeps(context), { ...body.value, [idKey]: params.id }) : body
  })
}
