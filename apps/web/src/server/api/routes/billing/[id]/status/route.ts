import { changeDocumentStatus } from '@ops/module-billing'
import { billingDeps } from '../../../../../billing/deps'
import { contractBody } from '../../../../contracts'
import { apiRoute } from '../../../../http'

/** `POST /api/v1/billing/[id]/status`: moves a document to its next state. */
export const POST = apiRoute<{ id: string }>(async ({ request, params, context }) => {
  const body = await contractBody(request, 'billing.status')
  return body.ok ? changeDocumentStatus(await billingDeps(context), { ...body.value, id: params.id }) : body
})
