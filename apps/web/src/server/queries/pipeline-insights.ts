import { pipelineSummary, type PipelineDeal, type PipelineLead, type PipelineSummary } from '@ops/module-crm'
import { crmDeps, type RequestContext } from '../container'
import { workflowOrThrow } from '../workflow-result'

const MONTHS = 6

const text = (value: unknown): string => (typeof value === 'string' ? value : '')
const refId = (value: unknown): string | null => {
  const id = typeof value === 'object' && value !== null ? (value as { id?: unknown }).id : value
  return typeof id === 'string' && id !== '' ? id : null
}

/** Just the fields the figures use, read in pages so a workspace with thousands of leads and deals stays quick. */
async function loadRows(context: RequestContext): Promise<{ leads: PipelineLead[]; deals: PipelineDeal[] }> {
  const request = { depth: 0, limit: 0, pagination: false, overrideAccess: false as const, req: context.req }
  const [leads, deals] = await Promise.all([
    context.payload.find({ collection: 'leads', select: { stageId: true, source: true }, ...request }),
    context.payload.find({
      collection: 'deals',
      select: { stageId: true, closedAt: true, valueAmountMinor: true, valueCurrency: true },
      ...request,
    }),
  ])
  return {
    leads: leads.docs.map((lead) => ({ stageId: text(lead.stageId), sourceId: refId(lead.source) })) as PipelineLead[],
    deals: deals.docs.map((deal) => ({
      stageId: text(deal.stageId),
      closedAt: typeof deal.closedAt === 'number' ? deal.closedAt : null,
      value:
        typeof deal.valueAmountMinor === 'number' && text(deal.valueCurrency) !== ''
          ? { amountMinor: deal.valueAmountMinor, currency: text(deal.valueCurrency) }
          : null,
    })) as PipelineDeal[],
  }
}

const CACHE_MS = 60_000
const MAX_CACHED = 50
const cache = new Map<string, { readonly at: number; readonly summary: PipelineSummary }>()

/**
 * Stage totals, revenue won per month, lead sources and win rate for everything the actor may read. Reading every lead
 * and deal is the slowest part of the dashboard, so a person's figures are reused for a minute.
 */
export async function loadPipelineSummary(context: RequestContext): Promise<PipelineSummary> {
  const key = String(context.actor.id)
  const hit = cache.get(key)
  if (hit !== undefined && Date.now() - hit.at < CACHE_MS) return hit.summary
  const summary = await computePipelineSummary(context)
  if (cache.size >= MAX_CACHED) cache.clear()
  cache.set(key, { at: Date.now(), summary })
  return summary
}

async function computePipelineSummary(context: RequestContext): Promise<PipelineSummary> {
  const deps = await crmDeps(context)
  const [rows, leadWorkflow, dealWorkflow, sources] = await Promise.all([
    loadRows(context),
    deps.repo.loadDefaultWorkflow('lead').then(workflowOrThrow),
    deps.repo.loadDefaultWorkflow('deal').then(workflowOrThrow),
    deps.repo.listLookups('source'),
  ])
  return pipelineSummary({
    ...rows,
    leadStages: leadWorkflow.stages,
    dealStages: dealWorkflow.stages,
    sources: new Map(sources.map((source) => [source.id, source.name])),
    now: Date.now(),
    months: MONTHS,
  })
}
