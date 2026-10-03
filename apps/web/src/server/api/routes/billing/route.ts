import { listBillingPage } from '@ops/adapter-payload'
import { createDocument } from '@ops/module-billing'
import { ok } from '@ops/kernel'
import { isManagerUp } from '@ops/platform'
import { billingDeps } from '../../../billing/deps'
import { contractBody } from '../../contracts'
import { apiRoute } from '../../http'
import { pageOf, pageWindowOf } from '../../page-window'
import { listFilters } from './filters'
import { domainError, err } from '@ops/kernel'

/** `GET /api/v1/billing`: quotes and invoices, newest first. */
export const GET = apiRoute(async ({ request, context }) => {
  if (!isManagerUp(context.actor)) return err(domainError('FORBIDDEN', 'Only owners and managers can see billing.'))
  const url = new URL(request.url)
  const window = pageWindowOf(url)
  if (!window.ok) return window
  const found = await listBillingPage(context.req, { where: listFilters(url), ...window.value })
  return ok(pageOf(found, window.value))
})

/** `POST /api/v1/billing`: creates a draft quote or invoice. */
export const POST = apiRoute(async ({ request, context }) => {
  const body = await contractBody(request, 'billing.create')
  return body.ok ? createDocument(await billingDeps(context), body.value) : body
}, 201)
