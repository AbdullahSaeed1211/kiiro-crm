import { ok } from '@ops/kernel'
import { validateCustomValues, visibleFields, type FieldDefinition } from '@ops/platform'
import { z } from 'zod'
import { parseCsv } from '../domain/csv'
import { executeCommand, failure, parse, type CrmResult } from '../domain/helpers'
import type { CrmDeps } from '../ports/repository'
import { createOrganizationSchema, createContactSchema, createDealSchema, createLeadSchema } from '../schema'
import { createContact, createOrganization } from './crud'
import { customValues } from './import-values'
import { dealFields, loadDeals, rowDealKey, type DealLookups } from './import-deals'
import { createDeal, createLead } from './pipeline'

/** The most rows one import takes; larger files go in several imports. */
export const MAX_IMPORT_ROWS = 500

const IMPORT_TYPES = ['organization', 'contact', 'lead', 'deal'] as const
type ImportType = (typeof IMPORT_TYPES)[number]

const importSchema = z
  .object({
    type: z.enum(IMPORT_TYPES),
    csv: z.string().min(1).max(5_000_000),
    dryRun: z.boolean().optional(),
    /** The currency of a deal amount that names none; the workspace's currency. */
    currency: z
      .string()
      .regex(/^[A-Za-z]{3}$/u)
      .optional(),
  })
  .strict()

/** The column names an import file may use for each record type, besides custom field keys. */
export const CORE_COLUMNS: Readonly<Record<ImportType, readonly string[]>> = {
  organization: ['name', 'website', 'phone', 'email'],
  contact: ['firstName', 'lastName', 'email', 'phone', 'organization'],
  lead: ['title', 'firstName', 'lastName', 'email', 'phone', 'companyName', 'organization', 'source'],
  deal: ['title', 'organization', 'value', 'currency', 'stage', 'expectedClose'],
}

/** What an import did, or would do in a dry run. `row` counts from 1 at the first data row. */
export interface ImportReport {
  readonly total: number
  readonly created: number
  readonly skipped: number
  readonly organizationsCreated: number
  readonly errors: readonly { readonly row: number; readonly message: string }[]
  readonly ignoredColumns: readonly string[]
}

type Cells = Readonly<Record<string, string>>
type RowOutcome = 'created' | 'skipped' | { readonly error: string }

interface Lookups {
  readonly organizations: Map<string, string>
  readonly sources: ReadonlyMap<string, string>
  readonly emails: Set<string>
  readonly deals: DealLookups | undefined
  readonly fields: ReadonlyMap<string, FieldDefinition>
}

interface RunState {
  readonly deps: CrmDeps
  readonly type: ImportType
  readonly dryRun: boolean
  readonly lookups: Lookups
  organizationsCreated: number
}

const lower = (value: string | undefined): string => (value ?? '').trim().toLowerCase()
const text = (cells: Cells, key: string): string | undefined => {
  const value = (cells[key] ?? '').trim()
  return value === '' ? undefined : value
}

async function loadLookups(deps: CrmDeps, input: { type: ImportType; currency: string }): Promise<Lookups> {
  const { type } = input
  const [organizations, sources, contacts, leads, definitions] = await Promise.all([
    deps.repo.list('organization'),
    deps.repo.listLookups('source'),
    type === 'contact' ? deps.repo.list('contact') : Promise.resolve([]),
    type === 'lead' ? deps.repo.list('lead') : Promise.resolve([]),
    deps.repo.loadFieldDefinitions(type),
  ])
  const deals = type === 'deal' ? await loadDeals(deps, input.currency) : undefined
  const emails = new Set([
    ...[...contacts, ...leads].flatMap((record) => (record.email === null ? [] : [lower(record.email)])),
    ...(deals?.existing ?? []),
  ])
  return {
    organizations: new Map(organizations.map((organization) => [lower(organization.name), organization.id])),
    sources: new Map(sources.map((source) => [lower(source.name), source.id])),
    emails,
    deals: deals?.lookups,
    fields: new Map(visibleFields(definitions, deps.actor).map((field) => [field.key, field])),
  }
}

/** Maps each header to its canonical column (a core column or a custom field key, any letter case). */
function columnMap(type: ImportType, headers: readonly string[], fields: ReadonlyMap<string, FieldDefinition>) {
  const known = new Map([...CORE_COLUMNS[type], ...fields.keys()].map((name) => [lower(name), name]))
  const columns: (string | undefined)[] = headers.map((header) => known.get(lower(header)))
  const ignored = headers.filter((_, index) => columns[index] === undefined && headers[index]?.trim() !== '')
  return { columns, ignored }
}

function validateCustom(state: RunState, cells: Cells): { data: Record<string, unknown> } | { error: string } {
  const converted = customValues(cells, state.lookups.fields)
  if (!converted.ok) return { error: converted.message }
  const checked = validateCustomValues([...state.lookups.fields.values()], converted.data)
  if (checked.ok) return { data: checked.value }
  const fields = checked.error.details?.['fields']
  return {
    error: typeof fields === 'object' && fields !== null ? Object.values(fields).join('; ') : checked.error.message,
  }
}

/** Checks the row against its create schema, then runs the create command unless this is a dry run. */
async function submit(state: RunState, input: Record<string, unknown>): Promise<string | undefined> {
  const { type, deps, dryRun } = state
  const schema = {
    organization: createOrganizationSchema,
    contact: createContactSchema,
    lead: createLeadSchema,
    deal: createDealSchema,
  }[type]
  const parsed = schema.safeParse(input)
  if (!parsed.success) return parsed.error.issues[0]?.message ?? 'The row is not valid'
  if (dryRun) return undefined
  const command = { organization: createOrganization, contact: createContact, lead: createLead, deal: createDeal }[type]
  const result = await command(deps, input)
  return result.ok ? undefined : result.error.message
}

async function organizationId(state: RunState, name: string | undefined): Promise<string | { error: string } | null> {
  if (name === undefined) return null
  const { organizations } = state.lookups
  const known = organizations.get(lower(name))
  if (known !== undefined) return known
  if (state.type === 'lead') return { error: `organization "${name}" does not exist; import organizations first` }
  if (!state.dryRun) {
    const created = await createOrganization(state.deps, { name })
    if (!created.ok) return { error: `organization "${name}": ${created.error.message}` }
    organizations.set(lower(name), created.value.id)
    state.organizationsCreated += 1
    return created.value.id
  }
  organizations.set(lower(name), `dry-run:${name}`)
  state.organizationsCreated += 1
  return null
}

function baseInput(state: RunState, cells: Cells): Record<string, unknown> {
  if (state.type === 'organization') {
    return {
      name: text(cells, 'name'),
      website: text(cells, 'website'),
      phone: text(cells, 'phone'),
      email: text(cells, 'email'),
    }
  }
  if (state.type === 'deal') return {}
  const person = {
    firstName: text(cells, 'firstName'),
    lastName: text(cells, 'lastName'),
    email: text(cells, 'email'),
    phone: text(cells, 'phone'),
  }
  if (state.type === 'contact') return person
  const company = text(cells, 'companyName')
  return { title: text(cells, 'title') ?? person.firstName ?? company ?? person.email, ...person, companyName: company }
}

function rowInput(state: RunState, cells: Cells): { input: Record<string, unknown> } | { error: string } {
  const custom = validateCustom(state, cells)
  if ('error' in custom) return custom
  const input = { ...baseInput(state, cells), customData: custom.data }
  if (state.lookups.deals === undefined) return { input }
  const deal = dealFields(cells, state.lookups.deals)
  return 'error' in deal ? deal : { input: { ...input, ...deal.input } }
}

async function linkOrganizationAndSource(
  state: RunState,
  cells: Cells,
  input: Record<string, unknown>,
): Promise<string | undefined> {
  if (state.type === 'organization') return undefined
  const organization = await organizationId(state, text(cells, 'organization'))
  if (typeof organization === 'object' && organization !== null) return organization.error
  if (organization !== null) input['organizationId'] = organization
  const sourceName = text(cells, 'source')
  if (state.type !== 'lead' || sourceName === undefined) return undefined
  const sourceId = state.lookups.sources.get(lower(sourceName))
  if (sourceId === undefined) return `source "${sourceName}" does not exist`
  input['sourceId'] = sourceId
  return undefined
}

function isDuplicate(state: RunState, input: Record<string, unknown>, cells: Cells): boolean {
  const { type, lookups } = state
  if (type === 'organization')
    return typeof input['name'] === 'string' && lookups.organizations.has(lower(input['name']))
  if (type === 'deal') return lookups.emails.has(rowDealKey(input, cells))
  const email = typeof input['email'] === 'string' ? lower(input['email']) : ''
  return email !== '' && lookups.emails.has(email)
}

function remember(state: RunState, input: Record<string, unknown>, cells: Cells): void {
  const { type, lookups } = state
  if (type === 'organization') lookups.organizations.set(lower(String(input['name'])), 'new')
  else if (type === 'deal') lookups.emails.add(rowDealKey(input, cells))
  else if (typeof input['email'] === 'string') lookups.emails.add(lower(input['email']))
}

async function importRow(state: RunState, cells: Cells): Promise<RowOutcome> {
  const row = rowInput(state, cells)
  if ('error' in row) return row
  const { input } = row
  if (isDuplicate(state, input, cells)) return 'skipped'
  const linkError = await linkOrganizationAndSource(state, cells, input)
  if (linkError !== undefined) return { error: linkError }
  const submitError = await submit(state, input)
  if (submitError !== undefined) return { error: submitError }
  remember(state, input, cells)
  return 'created'
}

interface Table {
  readonly header: readonly string[]
  readonly dataRows: readonly (readonly string[])[]
}

function readTable(csv: string): CrmResult<Table> {
  let table: string[][]
  try {
    table = parseCsv(csv)
  } catch (error) {
    return failure('VALIDATION', error instanceof Error ? error.message : 'The file is not valid CSV')
  }
  const [header = [], ...dataRows] = table
  if (dataRows.length === 0) return failure('VALIDATION', 'The file has no rows below its header')
  if (dataRows.length > MAX_IMPORT_ROWS)
    return failure('VALIDATION', `An import takes at most ${String(MAX_IMPORT_ROWS)} rows; split the file`)
  return ok({ header, dataRows })
}

async function processRows(state: RunState, table: Table): Promise<ImportReport> {
  const { columns, ignored } = columnMap(state.type, table.header, state.lookups.fields)
  const errors: { row: number; message: string }[] = []
  let created = 0
  let skipped = 0
  for (const [index, values] of table.dataRows.entries()) {
    const cells = Object.fromEntries(
      columns.flatMap((column, position) => (column === undefined ? [] : [[column, values[position] ?? '']])),
    )
    const outcome = await importRow(state, cells)
    if (outcome === 'created') created += 1
    else if (outcome === 'skipped') skipped += 1
    else errors.push({ row: index + 1, message: outcome.error })
  }
  const total = table.dataRows.length
  return { total, created, skipped, organizationsCreated: state.organizationsCreated, errors, ignoredColumns: ignored }
}

async function importWork(deps: CrmDeps, input: unknown): Promise<CrmResult<ImportReport>> {
  const parsed = parse(importSchema, input)
  if (!parsed.ok) return parsed
  const { type, csv, dryRun = false } = parsed.value
  if (deps.actor.role === 'staff') return failure('FORBIDDEN', 'only owners and managers can import')
  const table = readTable(csv)
  if (!table.ok) return table
  const lookups = await loadLookups(deps, { type, currency: parsed.value.currency ?? 'USD' })
  return ok(await processRows({ deps, type, dryRun, lookups, organizationsCreated: 0 }, table.value))
}

/**
 * Creates records from CSV text, one row at a time through the same create commands the app uses. A row that already
 * exists (same organization name or contact or lead email) is skipped, and a bad row is reported without stopping the rest.
 * A dry run validates every row and creates nothing. Only owners and managers may import.
 */
export function importRecords(deps: CrmDeps, input: unknown): Promise<CrmResult<ImportReport>> {
  return executeCommand(deps, input, importWork)
}
