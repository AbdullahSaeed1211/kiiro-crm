'use server'

import { revalidatePath } from 'next/cache'
import { importRecords, type ImportReport } from '@ops/module-crm'
import { crmDeps } from '../container'
import { toActionResult, type ActionResult } from '../action-result'

interface ImportInput {
  readonly type: 'organization' | 'contact' | 'lead'
  readonly csv: string
  readonly dryRun: boolean
}

/** Imports (or, with `dryRun`, only checks) a CSV of organizations, contacts or leads; owners and managers only. */
export async function importCsvAction(input: ImportInput): Promise<ActionResult<ImportReport>> {
  const result = await importRecords(await crmDeps(), input)
  if (result.ok && !input.dryRun) {
    for (const path of ['/organizations', '/contacts', '/leads']) revalidatePath(path)
  }
  return toActionResult(result)
}
