import { domainError, err, ok } from '@ops/kernel'
import { updateDocument } from '@ops/module-billing'
import { isManagerUp } from '@ops/platform'
import { billingDeps } from '../../../../billing/deps'
import { contractBody } from '../../../contracts'
import { apiRoute } from '../../../http'
import { asId } from '@ops/kernel'

/** `GET /api/v1/billing/[id]`: one quote or invoice. */
export const GET = apiRoute<{ id: string }>(async ({ params, context }) => {
  if (!isManagerUp(context.actor)) return err(domainError('FORBIDDEN', 'Only owners and managers can see billing.'))
  const document = await (await billingDeps(context)).repo.get(asId(params.id))
  return document === undefined ? err(domainError('NOT_FOUND', 'Document not found.')) : ok(document)
})

/** `PATCH /api/v1/billing/[id]`: edits a draft. */
export const PATCH = apiRoute<{ id: string }>(async ({ request, params, context }) => {
  const body = await contractBody(request, 'billing.update')
  return body.ok ? updateDocument(await billingDeps(context), { ...body.value, id: params.id }) : body
})
