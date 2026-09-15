import { createCrmRepository } from '@ops/adapter-payload'
import type { DealRecord, LeadRecord } from '@ops/module-crm'
import type { Workflow } from '@ops/platform'
import { getRequestContext, type RequestContext } from '../work/deps'
import { resolveReportRange, type ReportRange } from './report-range'
import { loadWorkReadModel, type WorkReadModel } from './work/read-models'

const TERMINAL_TASKS = new Set(['done_success', 'done_failure', 'cancelled'])
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
  readonly locale: WorkReadModel['locale']
  readonly timeZone: string
}

export { resolveReportRange } from './report-range'

function inRange(value: number | null, range: ReportRange): boolean {
  return value !== null && value >= range.from && value < range.to
}

function terminalStage(workflow: Workflow | undefined, record: LeadRecord | DealRecord): string | undefined {
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
  return id === null ? 'Unassigned' : people.get(id) ?? 'Unknown owner'
}

function figureFor(map: Map<string, FigureAccumulator>, id: string | null, people: ReadonlyMap<string, string>): FigureAccumulator {
  const key = id ?? '__unassigned__'
  const existing = map.get(key)
  if (existing !== undefined) return existing
  const created: FigureAccumulator = { id, name: ownerName(id, people), ...emptyCounts(), pipelineMinor: 0, pipelineCurrency: null }
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

function taskMetrics(task: WorkReadModel['tasks'][number], range: ReportRange, now: number): { include: boolean; open: boolean; completed: boolean; overdue: boolean } {
  const completed = inRange(task.completedAt, range)
  const due = inRange(task.dueAt, range)
  const open = !TERMINAL_TASKS.has(task.stageCategory)
  return { include: due || completed, open, completed, overdue: open && task.dueAt !== null && task.dueAt < now }
}

function addTaskCounts({ target, task, range, now }: Readonly<{ target: FigureCounts; task: WorkReadModel['tasks'][number]; range: ReportRange; now: number }>): boolean {
  const metrics = taskMetrics(task, range, now)
  if (!metrics.include) return false
  target.openTasks += metrics.open && inRange(task.dueAt, range) ? 1 : 0
  target.completedTasks += metrics.completed ? 1 : 0
  target.overdueTasks += metrics.overdue ? 1 : 0
  return true
}

function addLeadCount(target: FigureCounts): void {
  target.leads += 1
}

function dealMetrics(deal: DealRecord, workflow: Workflow | undefined, range: ReportRange): { created: boolean; won: boolean; open: boolean; include: boolean } {
  const created = inRange(deal.createdAt, range)
  const closed = inRange(deal.closedAt, range)
  if (!created && !closed) return { created: false, won: false, open: false, include: false }
  const category = terminalStage(workflow, deal)
  return { created, won: category === 'done_success' && closed, open: category === undefined || !TERMINAL_TASKS.has(category), include: true }
}

function addDealCounts(target: FigureCounts, metrics: ReturnType<typeof dealMetrics>): void {
  target.deals += metrics.created ? 1 : 0
  target.wonDeals += metrics.won ? 1 : 0
}

function addPipeline(target: Pick<FigureAccumulator, 'pipelineMinor' | 'pipelineCurrency'>, deal: DealRecord, open: boolean): void {
  if (!open || deal.value === null) return
  const next = currencyTotal(target, deal.value.amountMinor, deal.value.currency)
  target.pipelineMinor = next.pipelineMinor
  target.pipelineCurrency = next.pipelineCurrency
}

function aggregateTasks({ model, range, now, figures, totals }: Readonly<{ model: WorkReadModel; range: ReportRange; now: number; figures: Map<string, FigureAccumulator>; totals: FigureCounts }>): void {
  for (const task of model.tasks) {
    if (!addTaskCounts({ target: totals, task, range, now })) continue
    for (const id of task.assigneeIds.length > 0 ? task.assigneeIds : [null]) {
      addTaskCounts({ target: figureFor(figures, id, model.people), task, range, now })
    }
  }
}

function aggregateLeads({ leads, range, people, figures, totals }: Readonly<{ leads: readonly LeadRecord[]; range: ReportRange; people: ReadonlyMap<string, string>; figures: Map<string, FigureAccumulator>; totals: FigureCounts }>): void {
  for (const lead of leads) {
    if (!inRange(lead.createdAt, range)) continue
    const id = lead.ownerId === null ? null : String(lead.ownerId)
    addLeadCount(totals)
    addLeadCount(figureFor(figures, id, people))
  }
}

function aggregateDeals({ deals, workflow, range, people, figures, totals }: Readonly<{ deals: readonly DealRecord[]; workflow: Workflow | undefined; range: ReportRange; people: ReadonlyMap<string, string>; figures: Map<string, FigureAccumulator>; totals: FigureCounts & Pick<FigureAccumulator, 'pipelineMinor' | 'pipelineCurrency'> }>): void {
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
  const [model, repository] = await Promise.all([
    loadWorkReadModel(requestContext),
    Promise.resolve(createCrmRepository(requestContext.req)),
  ])
  const range = resolveReportRange(input)
  const [leads, deals, dealWorkflow] = await Promise.all([
    repository.list('lead'),
    repository.list('deal'),
    repository.loadDefaultWorkflow('deal').catch(() => undefined),
  ])
  const figures = new Map<string, FigureAccumulator>()
  const now = Date.now()
  const totals: ReportFigures['totals'] = { ...emptyCounts(), pipelineMinor: 0, pipelineCurrency: null }
  aggregateTasks({ model, range, now, figures, totals })
  aggregateLeads({ leads, range, people: model.people, figures, totals })
  aggregateDeals({ deals, workflow: dealWorkflow, range, people: model.people, figures, totals })
  return {
    range,
    totals,
    owners: [...figures.values()].sort((a, b) => b.openTasks + b.pipelineMinor - (a.openTasks + a.pipelineMinor) || a.name.localeCompare(b.name)),
    locale: model.locale,
    timeZone: model.timeZone,
  }
}
