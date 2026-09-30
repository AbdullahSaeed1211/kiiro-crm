'use server'

import { revalidatePath } from 'next/cache'
import { archiveRecord, restoreRecord } from '@ops/module-crm'
import { crmDeps } from '../container'
import { toActionResult, type ActionResult } from '../action-result'

const LIST_PATHS = { organization: '/organizations', contact: '/contacts', lead: '/leads', deal: '/deals' } as const

/** Archives a CRM record (owners and managers only) and refreshes its list. */
export async function archiveRecordAction(input: unknown): Promise<ActionResult<unknown>> {
  const result = await archiveRecord(await crmDeps(), input)
  if (result.ok) revalidatePath(LIST_PATHS[result.value.type])
  return toActionResult(result)
}

/** Brings an archived record back (owners and managers only) and refreshes its list and the archive screen. */
export async function restoreRecordAction(input: unknown): Promise<ActionResult<unknown>> {
  const result = await restoreRecord(await crmDeps(), input)
  if (result.ok) {
    revalidatePath(LIST_PATHS[result.value.type])
    revalidatePath('/settings/archive')
  }
  return toActionResult(result)
}
