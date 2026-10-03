import type { BillingCopy } from '../../../i18n/billing-copy'
import { readApi } from '../api-client'

export type SubmitResult = { readonly ok: true; readonly id: string } | { readonly ok: false; readonly message: string }

/** Sends a new document (POST) or a draft's changes (PATCH) to the product API. */
export async function submitBilling(input: {
  readonly editId: string | undefined
  readonly body: object
  readonly copy: BillingCopy
}): Promise<SubmitResult> {
  const { editId, body, copy } = input
  const response = await fetch(editId === undefined ? '/api/v1/billing' : `/api/v1/billing/${editId}`, {
    method: editId === undefined ? 'POST' : 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => undefined)
  if (response === undefined) return { ok: false, message: copy.saveFailed }
  const result = await readApi<{ id: string }>(response, copy.saveFailed)
  return result.ok ? { ok: true, id: editId ?? result.data.id } : { ok: false, message: result.message }
}
