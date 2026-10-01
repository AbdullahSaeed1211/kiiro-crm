'use server'

import { revalidatePath } from 'next/cache'
import { importRecords, type ImportReport } from '@ops/module-crm'
import { getWorkspaceSettings } from '../auth/context'
import { crmDeps } from '../container'
import { toActionResult, type ActionResult } from '../action-result'

interface ImportInput {
  readonly type: 'organization' | 'contact' | 'lead' | 'deal'
  readonly csv: string
  readonly dryRun: boolean
}

/** Imports (or, with `dryRun`, only checks) a CSV of organizations, contacts, leads or deals; owners and managers only. */
export async function importCsvAction(input: ImportInput): Promise<ActionResult<ImportReport>> {
  const { currency } = await getWorkspaceSettings()
  const result = await importRecords(await crmDeps(), {
    ...input,
    ...(typeof currency === 'string' ? { currency } : {}),
  })
  if (result.ok && !input.dryRun) {
    for (const path of ['/organizations', '/contacts', '/leads', '/deals']) revalidatePath(path)
  }
  return toActionResult(result)
}
