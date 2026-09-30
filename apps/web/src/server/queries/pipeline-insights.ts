import { pipelineSummary, type PipelineSummary } from '@ops/module-crm'
import { crmDeps, type RequestContext } from '../container'
import { workflowOrThrow } from '../workflow-result'

const MONTHS = 6

/** Stage totals, revenue won per month, lead sources and win rate for everything the actor may read. */
export async function loadPipelineSummary(context: RequestContext): Promise<PipelineSummary> {
  const deps = await crmDeps(context)
  const [leads, deals, leadWorkflow, dealWorkflow, sources] = await Promise.all([
    deps.repo.list('lead'),
    deps.repo.list('deal'),
    deps.repo.loadDefaultWorkflow('lead').then(workflowOrThrow),
    deps.repo.loadDefaultWorkflow('deal').then(workflowOrThrow),
    deps.repo.listLookups('source'),
  ])
  return pipelineSummary({
    leads,
    deals,
    leadStages: leadWorkflow.stages,
    dealStages: dealWorkflow.stages,
    sources: new Map(sources.map((source) => [source.id, source.name])),
    now: Date.now(),
    months: MONTHS,
  })
}
