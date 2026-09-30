import { exportTable, formatCsv, type CrmRecordType, type ExportLookups } from '@ops/module-crm'
import { crmDeps } from '../container'
import type { ProductContext } from '../auth/context'
import { loadPeople } from '../people'

const names = <T extends { readonly id: string }>(rows: readonly T[], name: (row: T) => string): Map<string, string> =>
  new Map(rows.map((row) => [row.id, name(row)]))

/** All the records of one type the actor may read, as CSV text that carries every custom field. */
export async function exportCsv(context: ProductContext, type: CrmRecordType): Promise<string> {
  const deps = await crmDeps(context)
  const [records, organizations, contacts, sources, fields] = await Promise.all([
    deps.repo.list(type),
    deps.repo.list('organization'),
    deps.repo.list('contact'),
    deps.repo.listLookups('source'),
    deps.repo.loadFieldDefinitions(type),
  ])
  const ownerIds = records.flatMap((record) => ('ownerId' in record && record.ownerId !== null ? [record.ownerId] : []))
  const people = await loadPeople(context, ownerIds)
  const workflow = type === 'lead' || type === 'deal' ? await deps.repo.loadDefaultWorkflow(type) : undefined
  const lookups: ExportLookups = {
    people: new Map([...people].map(([id, person]) => [id, person.name])),
    organizations: names(organizations, (row) => row.name),
    contacts: names(contacts, (row) => [row.firstName, row.lastName].filter(Boolean).join(' ')),
    sources: names(sources, (row) => row.name),
    stages: new Map(workflow?.ok === true ? workflow.value.stages.map((stage) => [stage.id, stage.name]) : []),
  }
  return formatCsv(exportTable({ type, records, lookups, fields }))
}
