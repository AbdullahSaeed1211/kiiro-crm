import type { Stage } from '@ops/platform'
import type { DealRecord, LeadRecord } from '../ports/records'

/** One stage of a pipeline with how many records sit in it and, for deals, what they are worth. */
export interface StageTotal {
  readonly name: string
  readonly color: string
  readonly category: string
  readonly count: number
  readonly valueMinor: number
}

export interface MonthTotal {
  /** `YYYY-MM`. */
  readonly month: string
  readonly count: number
  readonly valueMinor: number
}

export interface PipelineSummary {
  readonly leadStages: readonly StageTotal[]
  readonly dealStages: readonly StageTotal[]
  readonly wonByMonth: readonly MonthTotal[]
  readonly leadSources: readonly { readonly name: string; readonly count: number }[]
  /** Won deals over won plus lost deals, or null before any deal has closed. */
  readonly winRate: number | null
  /** The currency the values are in: the one most deals use; deals in other currencies are left out of values. */
  readonly currency: string | null
}

const monthKey = (time: number): string => new Date(time).toISOString().slice(0, 7)

function stageTotals(input: {
  readonly stages: readonly Stage[]
  readonly records: readonly { readonly stageId: string; readonly value: number }[]
}): StageTotal[] {
  return [...input.stages]
    .sort((a, b) => a.position - b.position)
    .map((stage) => {
      const inStage = input.records.filter((record) => record.stageId === stage.id)
      return {
        name: stage.name,
        color: stage.color,
        category: stage.category,
        count: inStage.length,
        valueMinor: inStage.reduce((sum, record) => sum + record.value, 0),
      }
    })
}

function dominantCurrency(deals: readonly DealRecord[]): string | null {
  const counts = new Map<string, number>()
  for (const deal of deals)
    if (deal.value !== null) counts.set(deal.value.currency, (counts.get(deal.value.currency) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

/** The last `months` calendar months ending with the one that contains `now`, oldest first. */
function recentMonths(now: number, months: number): string[] {
  const end = new Date(now)
  return Array.from({ length: months }, (_, back) =>
    monthKey(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - (months - 1 - back), 1)),
  )
}

function wonMonths(input: {
  readonly won: readonly DealRecord[]
  readonly months: readonly string[]
  readonly currency: string | null
}): MonthTotal[] {
  return input.months.map((month) => {
    const closed = input.won.filter((deal) => deal.closedAt !== null && monthKey(deal.closedAt) === month)
    const valued = closed.filter((deal) => (deal.value?.currency ?? null) === input.currency)
    return {
      month,
      count: closed.length,
      valueMinor: valued.reduce((sum, deal) => sum + (deal.value?.amountMinor ?? 0), 0),
    }
  })
}

/** Counts and values for the pipeline screens: stages, revenue won per month, lead sources and win rate. */
export function pipelineSummary(input: {
  readonly leads: readonly LeadRecord[]
  readonly deals: readonly DealRecord[]
  readonly leadStages: readonly Stage[]
  readonly dealStages: readonly Stage[]
  readonly sources: ReadonlyMap<string, string>
  readonly now: number
  readonly months: number
}): PipelineSummary {
  const { leads, deals } = input
  const currency = dominantCurrency(deals)
  const categoryOf = new Map(input.dealStages.map((stage) => [stage.id, stage.category]))
  const won = deals.filter((deal) => categoryOf.get(deal.stageId) === 'done_success')
  const lost = deals.filter((deal) => categoryOf.get(deal.stageId) === 'done_failure')
  const sourceCounts = new Map<string, number>()
  for (const lead of leads) {
    const name = lead.sourceId === null ? 'No source' : (input.sources.get(lead.sourceId) ?? 'No source')
    sourceCounts.set(name, (sourceCounts.get(name) ?? 0) + 1)
  }
  return {
    leadStages: stageTotals({
      stages: input.leadStages,
      records: leads.map((lead) => ({ stageId: lead.stageId, value: 0 })),
    }),
    dealStages: stageTotals({
      stages: input.dealStages,
      records: deals.map((deal) => ({
        stageId: deal.stageId,
        value: deal.value !== null && deal.value.currency === currency ? deal.value.amountMinor : 0,
      })),
    }),
    wonByMonth: wonMonths({ won, months: recentMonths(input.now, input.months), currency }),
    leadSources: [...sourceCounts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    winRate: won.length + lost.length === 0 ? null : won.length / (won.length + lost.length),
    currency,
  }
}
