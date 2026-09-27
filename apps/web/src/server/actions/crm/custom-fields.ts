'use server'

import { setCustomFields } from '@ops/module-crm'
import type { CustomFieldsSaveResult } from '@ops/ui/composites/CustomFields'
import { revalidatePath } from 'next/cache'
import { actionFailure, toActionResult } from '../../action-result'
import { crmDeps } from '../../container'

const RECORD_PATHS = { organization: 'organizations', contact: 'contacts', lead: 'leads', deal: 'deals' } as const

/** Server action behind the custom fields card; field messages come back keyed by field key. */
export async function saveCustomFields(input: {
  readonly type: keyof typeof RECORD_PATHS
  readonly id: string
  readonly expectedUpdatedAt: number
  readonly values: Readonly<Record<string, unknown>>
}): Promise<CustomFieldsSaveResult> {
  try {
    const result = toActionResult(await setCustomFields(await crmDeps(), input))
    if (result.ok) {
      revalidatePath(`/${RECORD_PATHS[input.type]}/${input.id}`)
      return { ok: true }
    }
    const { message, fields } = result.error
    return fields === undefined ? { ok: false, message } : { ok: false, message, fields }
  } catch (error) {
    return {
      ok: false,
      message: actionFailure(error, 'saveCustomFields', 'Unable to save these fields.').error.message,
    }
  }
}
