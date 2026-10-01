import { createCrmRepository } from '@ops/adapter-payload'
import type { DealRecord } from '@ops/module-crm'
import type { Workflow } from '@ops/platform'
import { getRequestContext, type RequestContext } from '@/server/container'
import { resolveReportRange, type ReportRange } from './report-range'
import { loadLeanRows, type ReportDeal, type ReportLead } from './report-rows'
import { loadTaskFigures } from './report-task-counts'
import type { Locale } from '../../i18n/config'

const TERMINAL_DEALS = new Set(['done_success', 'done_failure', 'cancelled'])
export type { ReportRange, ReportRangeKey } from './report-range'

export interface OwnerFigure {
  readonly id: string | null
  readonly name: string
  readonly openTasks: number
  readonly completedTasks: number
  readonly overdueTasks: number
  readonly leads: number
  readonly deals: number
  readonly wonDeals: number
  readonly pipelineMinor: number
  readonly pipelineCurrency: string | null
}

export interface ReportFigures {
  readonly range: ReportRange
  readonly totals: {
    readonly openTasks: number
    readonly completedTasks: number
    readonly overdueTasks: number
    readonly leads: number
    readonly deals: number
    readonly wonDeals: number
    readonly pipelineMinor: number
    readonly pipelineCurrency: string | null
  }
  readonly owners: readonly OwnerFigure[]
  readonly locale: Locale
  readonly timeZone: string
}

export { resolveReportRange } from './report-range'

function inRange(value: number | null, range: ReportRange): boolean {
  return value !== null && value >= range.from && value < range.to
}

function terminalStage(workflow: Workflow | undefined, record: Pick<DealRecord, 'stageId'>): string | undefined {
  return workflow?.stages.find((stage) => stage.id === record.stageId)?.category
}

interface FigureCounts {
  openTasks: number
  completedTasks: number
  overdueTasks: number
  leads: number
  deals: number
  wonDeals: number
}

interface FigureAccumulator extends FigureCounts {
  readonly id: string | null
  readonly name: string
  pipelineMinor: number
  pipelineCurrency: string | null
}

function emptyCounts(): FigureCounts {
  return { openTasks: 0, completedTasks: 0, overdueTasks: 0, leads: 0, deals: 0, wonDeals: 0 }
}

function ownerName(id: string | null, people: ReadonlyMap<string, string>): string {
  return id === null ? 'Unassigned' : (people.get(id) ?? 'Unknown owner')
}

function figureFor(
  map: Map<string, FigureAccumulator>,
  id: string | null,
  people: ReadonlyMap<string, string>,
): FigureAccumulator {
  const key = id ?? '__unassigned__'
  const existing = map.get(key)
  if (existing !== undefined) return existing
  const created: FigureAccumulator = {
    id,
    name: ownerName(id, people),
    ...emptyCounts(),
    pipelineMinor: 0,
    pipelineCurrency: null,
  }
  map.set(key, created)
  return created
}

function currencyTotal(
  current: Pick<OwnerFigure, 'pipelineMinor' | 'pipelineCurrency'>,
  amountMinor: number,
  currency: string,
): Pick<OwnerFigure, 'pipelineMinor' | 'pipelineCurrency'> {
  if (current.pipelineCurrency === null && current.pipelineMinor > 0) {
    return { pipelineMinor: current.pipelineMinor, pipelineCurrency: null }
  }
  if (current.pipelineCurrency === null || current.pipelineCurrency === currency) {
    return { pipelineMinor: current.pipelineMinor + amountMinor, pipelineCurrency: currency }
  }
  return { pipelineMinor: current.pipelineMinor, pipelineCurrency: null }
}

function addLeadCount(target: FigureCounts): void {
  target.leads += 1
}

function dealMetrics(
  deal: ReportDeal,
  workflow: Workflow | undefined,
  range: ReportRange,
): { created: boolean; won: boolean; open: boolean; include: boolean } {
  const created = inRange(deal.createdAt, range)
  const closed = inRange(deal.closedAt, range)
  if (!created && !closed) return { created: false, won: false, open: false, include: false }
  const category = terminalStage(workflow, deal)
  return {
    created,
    won: category === 'done_success' && closed,
    open: category === undefined || !TERMINAL_DEALS.has(category),
    include: true,
  }
}

function addDealCounts(target: FigureCounts, metrics: ReturnType<typeof dealMetrics>): void {
  target.deals += metrics.created ? 1 : 0
  target.wonDeals += metrics.won ? 1 : 0
}

function addPipeline(
  target: Pick<FigureAccumulator, 'pipelineMinor' | 'pipelineCurrency'>,
  deal: ReportDeal,
  open: boolean,
): void {
  if (!open || deal.value === null) return
  const next = currencyTotal(target, deal.value.amountMinor, deal.value.currency)
  target.pipelineMinor = next.pipelineMinor
  target.pipelineCurrency = next.pipelineCurrency
}

function aggregateLeads({
  leads,
  range,
  people,
  figures,
  totals,
}: Readonly<{
  leads: readonly ReportLead[]
  range: ReportRange
  people: ReadonlyMap<string, string>
  figures: Map<string, FigureAccumulator>
  totals: FigureCounts
}>): void {
  for (const lead of leads) {
    if (!inRange(lead.createdAt, range)) continue
    const id = lead.ownerId === null ? null : String(lead.ownerId)
    addLeadCount(totals)
    addLeadCount(figureFor(figures, id, people))
  }
}

function aggregateDeals({
  deals,
  workflow,
  range,
  people,
  figures,
  totals,
}: Readonly<{
  deals: readonly ReportDeal[]
  workflow: Workflow | undefined
  range: ReportRange
  people: ReadonlyMap<string, string>
  figures: Map<string, FigureAccumulator>
  totals: FigureCounts & Pick<FigureAccumulator, 'pipelineMinor' | 'pipelineCurrency'>
}>): void {
  for (const deal of deals) {
    const metrics = dealMetrics(deal, workflow, range)
    if (!metrics.include) continue
    addDealCounts(totals, metrics)
    const figure = figureFor(figures, deal.ownerId === null ? null : String(deal.ownerId), people)
    addDealCounts(figure, metrics)
    addPipeline(figure, deal, metrics.open)
    addPipeline(totals, deal, metrics.open)
  }
}

/** Permission-scoped owner/manager figures for the reporting workspace. */
export async function loadReportFigures(
  input: { readonly range?: unknown; readonly from?: unknown; readonly to?: unknown } = {},
  context?: RequestContext,
): Promise<ReportFigures> {
  const requestContext = context ?? (await getRequestContext())
  const repository = createCrmRepository(requestContext.req)
  const range = resolveReportRange(input)
  const now = Date.now()
  const [taskFigures, { leads, deals }, dealWorkflow] = await Promise.all([
    loadTaskFigures(requestContext, { range, now }),
    loadLeanRows(requestContext),
    repository.loadDefaultWorkflow('deal').then(
      (result) => (result.ok ? result.value : undefined),
      () => undefined,
    ),
  ])
  const figures = new Map<string, FigureAccumulator>()
  const { people } = taskFigures
  const totals: ReportFigures['totals'] = {
    ...emptyCounts(),
    ...taskFigures.totals,
    pipelineMinor: 0,
    pipelineCurrency: null,
  }
  for (const [owner, counts] of taskFigures.byOwner) Object.assign(figureFor(figures, owner, people), counts)
  aggregateLeads({ leads, range, people, figures, totals })
  aggregateDeals({ deals, workflow: dealWorkflow, range, people, figures, totals })
  return {
    range,
    totals,
    owners: [...figures.values()].sort(
      (a, b) => b.openTasks + b.pipelineMinor - (a.openTasks + a.pipelineMinor) || a.name.localeCompare(b.name),
    ),
    locale: taskFigures.locale,
    timeZone: taskFigures.timeZone,
  }
}
