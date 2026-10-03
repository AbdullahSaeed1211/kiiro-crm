import { invoiceFromQuote } from '@ops/module-billing'
import { billingDeps } from '../../../../../billing/deps'
import { contractBody } from '../../../../contracts'
import { apiRoute } from '../../../../http'

/** `POST /api/v1/billing/[id]/invoice`: copies an accepted quote into a draft invoice. */
export const POST = apiRoute<{ id: string }>(async ({ request, params, context }) => {
  const body = await contractBody(request, 'billing.invoice')
  return body.ok ? invoiceFromQuote(await billingDeps(context), { ...body.value, quoteId: params.id }) : body
}, 201)
