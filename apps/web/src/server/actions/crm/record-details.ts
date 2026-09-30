'use server'

import { updateContact, updateLead, updateOrganization } from '@ops/module-crm'
import type { CustomFieldsSaveResult } from '@ops/ui/composites/CustomFields'
import { revalidatePath } from 'next/cache'
import { actionFailure, toActionResult } from '../../action-result'
import { crmDeps } from '../../container'

const RECORD_PATHS = { organization: 'organizations', contact: 'contacts', lead: 'leads' } as const
type DetailType = keyof typeof RECORD_PATHS

const UPDATES = { organization: updateOrganization, contact: updateContact, lead: updateLead } as const

/** Empty text clears an optional field. */
function normalizePatch(values: Readonly<Record<string, unknown>>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value === '' ? null : value]))
}

/** `patch.email` from the command's schema becomes `email`, the key the card shows the message under. */
function fieldKeys(fields: Readonly<Record<string, string>>): Record<string, string> {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key.split('.').at(-1) ?? key, value]))
}

/** Server action behind the Details card: saves built-in fields through the record's update command. */
export async function saveRecordDetails(input: {
  readonly type: DetailType
  readonly id: string
  readonly expectedUpdatedAt: number
  readonly values: Readonly<Record<string, unknown>>
}): Promise<CustomFieldsSaveResult> {
  try {
    const command = { id: input.id, expectedUpdatedAt: input.expectedUpdatedAt, patch: normalizePatch(input.values) }
    const result = toActionResult<unknown>(await UPDATES[input.type](await crmDeps(), command))
    if (result.ok) {
      revalidatePath(`/${RECORD_PATHS[input.type]}/${input.id}`)
      return { ok: true }
    }
    const { message, fields } = result.error
    return fields === undefined ? { ok: false, message } : { ok: false, message, fields: fieldKeys(fields) }
  } catch (error) {
    return {
      ok: false,
      message: actionFailure(error, 'saveRecordDetails', 'Unable to save these fields.').error.message,
    }
  }
}
