'use server'

import { revalidatePath } from 'next/cache'
import { importRecords, type ImportReport } from '@ops/module-crm'
import { getWorkspaceSettings } from '../auth/context'
import { crmDeps } from '../container'
import { applyMapping, suggestColumns, type ColumnSuggestion } from './import-mapping'
import { toActionResult, type ActionResult } from '../action-result'

interface ImportInput {
  readonly type: 'organization' | 'contact' | 'lead' | 'deal'
  readonly csv: string
  readonly dryRun: boolean
  /** One entry per file column: a column name (the file's own name to keep it), or null to leave the column out. */
  readonly names?: readonly (string | null)[]
}

/** Imports (or, with `dryRun`, only checks) a CSV of organizations, contacts, leads or deals; owners and managers only. */
export async function importCsvAction(input: ImportInput): Promise<ActionResult<ImportReport>> {
  const { currency } = await getWorkspaceSettings()
  const { names, ...rest } = input
  const result = await importRecords(await crmDeps(), {
    ...rest,
    csv: names === undefined ? input.csv : applyMapping(input.csv, names),
    ...(typeof currency === 'string' ? { currency } : {}),
  })
  if (result.ok && !input.dryRun) {
    for (const path of ['/organizations', '/contacts', '/leads', '/deals']) revalidatePath(path)
  }
  return toActionResult(result)
}

/** The headers of a chosen file, each with the column we think it means, for the mapping step. */
export async function suggestColumnsAction(input: {
  readonly type: ImportInput['type']
  readonly csv: string
}): Promise<ColumnSuggestion> {
  await crmDeps()
  return suggestColumns(input.type, input.csv)
}
