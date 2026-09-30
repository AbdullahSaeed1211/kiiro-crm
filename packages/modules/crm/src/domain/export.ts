import type { FieldDefinition } from '@ops/platform'
import type {
  ContactRecord,
  CrmCustomData,
  CrmRecordType,
  DealRecord,
  LeadRecord,
  OrganizationRecord,
} from '../ports/records'

/** Names the export shows in place of ids; the caller fills these from what the actor may read. */
export interface ExportLookups {
  readonly people: ReadonlyMap<string, string>
  readonly organizations: ReadonlyMap<string, string>
  readonly contacts: ReadonlyMap<string, string>
  readonly sources: ReadonlyMap<string, string>
  readonly stages: ReadonlyMap<string, string>
}

interface Column<R> {
  readonly header: string
  readonly value: (record: R, lookups: ExportLookups) => string
}

const day = (time: number | null): string => (time === null ? '' : new Date(time).toISOString().slice(0, 10))
const named = (map: ReadonlyMap<string, string>, id: string | null): string => (id === null ? '' : (map.get(id) ?? ''))
const text = (value: string | null): string => value ?? ''

const ORGANIZATION: readonly Column<OrganizationRecord>[] = [
  { header: 'name', value: (r) => r.name },
  { header: 'website', value: (r) => text(r.website) },
  { header: 'phone', value: (r) => text(r.phone) },
  { header: 'email', value: (r) => text(r.email) },
  { header: 'owner', value: (r, l) => named(l.people, r.ownerId) },
  { header: 'created', value: (r) => day(r.createdAt) },
]

const CONTACT: readonly Column<ContactRecord>[] = [
  { header: 'firstName', value: (r) => r.firstName },
  { header: 'lastName', value: (r) => text(r.lastName) },
  { header: 'email', value: (r) => text(r.email) },
  { header: 'phone', value: (r) => text(r.phone) },
  { header: 'organization', value: (r, l) => named(l.organizations, r.organizationId) },
  { header: 'owner', value: (r, l) => named(l.people, r.ownerId) },
  { header: 'created', value: (r) => day(r.createdAt) },
]

const LEAD: readonly Column<LeadRecord>[] = [
  { header: 'title', value: (r) => r.title },
  { header: 'firstName', value: (r) => text(r.firstName) },
  { header: 'lastName', value: (r) => text(r.lastName) },
  { header: 'email', value: (r) => text(r.email) },
  { header: 'phone', value: (r) => text(r.phone) },
  { header: 'companyName', value: (r) => text(r.companyName) },
  { header: 'organization', value: (r, l) => named(l.organizations, r.organizationId) },
  { header: 'source', value: (r, l) => named(l.sources, r.sourceId) },
  { header: 'stage', value: (r, l) => l.stages.get(r.stageId) ?? '' },
  { header: 'owner', value: (r, l) => named(l.people, r.ownerId) },
  { header: 'nextAction', value: (r) => day(r.nextActionAt) },
  { header: 'created', value: (r) => day(r.createdAt) },
]

const DEAL: readonly Column<DealRecord>[] = [
  { header: 'title', value: (r) => r.title },
  { header: 'organization', value: (r, l) => named(l.organizations, r.organizationId) },
  { header: 'primaryContact', value: (r, l) => named(l.contacts, r.primaryContactId) },
  { header: 'value', value: (r) => (r.value === null ? '' : String(r.value.amountMinor / 100)) },
  { header: 'currency', value: (r) => r.value?.currency ?? '' },
  { header: 'stage', value: (r, l) => l.stages.get(r.stageId) ?? '' },
  { header: 'expectedClose', value: (r) => day(r.expectedCloseAt) },
  { header: 'closed', value: (r) => day(r.closedAt) },
  { header: 'owner', value: (r, l) => named(l.people, r.ownerId) },
  { header: 'created', value: (r) => day(r.createdAt) },
]

/** A stored custom value as a spreadsheet cell: lists joined with semicolons, yes or no for checkboxes, dates as days. */
function customCell(value: unknown, field: FieldDefinition): string {
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string').join('; ')
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  if (field.type === 'date' && typeof value === 'number') return day(value)
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

function table<R extends { readonly customData: CrmCustomData }>(
  input: Readonly<{
    columns: readonly Column<R>[]
    records: readonly R[]
    lookups: ExportLookups
    fields: readonly FieldDefinition[]
  }>,
): string[][] {
  const { columns, records, lookups, fields } = input
  const header = [...columns.map((column) => column.header), ...fields.map((field) => field.key)]
  const rows = records.map((record) => [
    ...columns.map((column) => column.value(record, lookups)),
    ...fields.map((field) => customCell(record.customData[field.key], field)),
  ])
  return [header, ...rows]
}

/** The export columns are the import template's columns (round trip) plus stage, dates and every custom field. */
export function exportTable(input: {
  readonly type: CrmRecordType
  readonly records: readonly unknown[]
  readonly lookups: ExportLookups
  readonly fields: readonly FieldDefinition[]
}): string[][] {
  const { type, lookups, fields } = input
  switch (type) {
    case 'organization':
      return table({ columns: ORGANIZATION, records: input.records as readonly OrganizationRecord[], lookups, fields })
    case 'contact':
      return table({ columns: CONTACT, records: input.records as readonly ContactRecord[], lookups, fields })
    case 'lead':
      return table({ columns: LEAD, records: input.records as readonly LeadRecord[], lookups, fields })
    case 'deal':
      return table({ columns: DEAL, records: input.records as readonly DealRecord[], lookups, fields })
  }
}
