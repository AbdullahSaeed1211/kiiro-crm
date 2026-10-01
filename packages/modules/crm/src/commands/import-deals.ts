import type { Workflow } from '@ops/platform'
import type { CrmDeps } from '../ports/repository'

type Cells = Readonly<Record<string, string>>

/** What a deal row needs from the tenant: the stages it can name, and the currency a bare amount is in. */
export interface DealLookups {
  readonly workflow: Workflow
  readonly stages: ReadonlyMap<string, string>
  readonly defaultCurrency: string
}

function dealLookups(workflow: Workflow, defaultCurrency: string): DealLookups {
  return {
    workflow,
    stages: new Map(workflow.stages.map((stage) => [stage.name.trim().toLowerCase(), stage.id])),
    defaultCurrency,
  }
}

const text = (cells: Cells, key: string): string => (cells[key] ?? '').trim()

/** An amount in major units ("1250.50" or "1,250") as the smallest currency unit. */
function amountMinor(amount: string, currency: string): number | undefined {
  const number = Number(amount.replaceAll(',', ''))
  if (!Number.isFinite(number) || number < 0) return undefined
  const digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits
  return Math.round(number * 10 ** (digits ?? 2))
}

type Part<T> = { readonly value: T } | { readonly error: string }

function money(cells: Cells, lookups: DealLookups): Part<unknown> {
  const amount = text(cells, 'value')
  if (amount === '') return { value: undefined }
  const currency = (text(cells, 'currency') || lookups.defaultCurrency).toUpperCase()
  if (!/^[A-Z]{3}$/u.test(currency)) return { error: `currency "${currency}" is not a three-letter code` }
  const minor = amountMinor(amount, currency)
  return minor === undefined
    ? { error: `value "${amount}" must be a number such as 1250.50` }
    : { value: { amountMinor: minor, currency } }
}

function stage(cells: Cells, lookups: DealLookups): Part<string> {
  const name = text(cells, 'stage')
  if (name === '') return { value: lookups.workflow.defaultStageId }
  const id = lookups.stages.get(name.toLowerCase())
  return id === undefined ? { error: `stage "${name}" does not exist in the deal pipeline` } : { value: id }
}

function closeDate(cells: Cells): Part<number | undefined> {
  const raw = text(cells, 'expectedClose')
  if (raw === '') return { value: undefined }
  const parsed = Date.parse(raw)
  return Number.isNaN(parsed) ? { error: 'expectedClose must be a date such as 2026-10-31' } : { value: parsed }
}

/** The deal-specific part of a create input from one CSV row, or the first cell that does not fit. */
export function dealFields(cells: Cells, lookups: DealLookups): { input: Record<string, unknown> } | { error: string } {
  const value = money(cells, lookups)
  if ('error' in value) return value
  const stageId = stage(cells, lookups)
  if ('error' in stageId) return stageId
  const closes = closeDate(cells)
  if ('error' in closes) return closes
  return {
    input: {
      title: text(cells, 'title') || undefined,
      workflowId: lookups.workflow.id,
      stageId: stageId.value,
      value: value.value,
      expectedCloseAt: closes.value,
    },
  }
}

/** The key two rows share when they are the same deal: its title at its organization. */
function dealKey(title: string, organization: string): string {
  return `${title.trim().toLowerCase()}|${organization.trim().toLowerCase()}`
}

/** The key of the deal a row would create. */
export function rowDealKey(input: Readonly<Record<string, unknown>>, cells: Cells): string {
  return dealKey(typeof input['title'] === 'string' ? input['title'] : '', text(cells, 'organization'))
}

/** The pipeline a deal row names its stage in, and the keys of the deals that already exist. */
export async function loadDeals(
  deps: CrmDeps,
  currency: string,
): Promise<{ lookups: DealLookups; existing: string[] }> {
  const [workflow, deals, organizations] = await Promise.all([
    deps.repo.loadDefaultWorkflow('deal'),
    deps.repo.list('deal'),
    deps.repo.list('organization'),
  ])
  if (!workflow.ok) throw new Error(workflow.error.message)
  const names = new Map(organizations.map((organization) => [String(organization.id), organization.name]))
  const existing = deals.map((deal) => dealKey(deal.title, names.get(String(deal.organizationId)) ?? ''))
  return { lookups: dealLookups(workflow.value, currency), existing }
}
