import type { DealRecord, OrganizationRecord, ContactRecord } from '@ops/module-crm'
import type { Workflow } from '@ops/platform'

export interface DealListItem {
  readonly deal: DealRecord
  readonly stage: Workflow['stages'][number]
  readonly organizationName: string | null
  readonly primaryContactName: string | null
}

export interface DealStageTotal {
  readonly stageId: string
  readonly name: string
  readonly category: Workflow['stages'][number]['category']
  readonly color: Workflow['stages'][number]['color']
  readonly count: number
  readonly amountMinor: number
  readonly currency: string | null
}

export function stageForDeal(deal: DealRecord, workflow: Workflow): Workflow['stages'][number] {
  return workflow.stages.find((stage) => stage.id === deal.stageId) ?? workflow.stages[0]
}

export function displayName(contact: ContactRecord | undefined): string | null {
  if (contact === undefined) return null
  return [contact.firstName, contact.lastName].filter(Boolean).join(' ')
}

export function aggregateStageTotals(deals: readonly DealRecord[], workflow: Workflow): readonly DealStageTotal[] {
  return workflow.stages.map((stage) => {
    const inStage = deals.filter((deal) => deal.stageId === stage.id)
    const currencies = new Set(
      inStage.map((deal) => deal.value?.currency).filter((value): value is string => value !== undefined),
    )
    const currency = currencies.size === 1 ? [...currencies][0] : null
    return {
      stageId: stage.id,
      name: stage.name,
      category: stage.category,
      color: stage.color,
      count: inStage.length,
      amountMinor: inStage.reduce((total, deal) => total + (deal.value?.amountMinor ?? 0), 0),
      currency,
    }
  })
}

export function formatMoney(value: { readonly amountMinor: number; readonly currency: string } | null): string {
  if (value === null) return '—'
  return new Intl.NumberFormat('en', { style: 'currency', currency: value.currency, maximumFractionDigits: 2 }).format(
    value.amountMinor / 100,
  )
}

export function formatDate(value: number | null): string {
  if (value === null) return '—'
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(value)
}

export function organizationName(deal: DealRecord, organizations: readonly OrganizationRecord[]): string | null {
  return organizations.find((organization) => organization.id === deal.organizationId)?.name ?? null
}
