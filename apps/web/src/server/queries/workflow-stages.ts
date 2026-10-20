import type { RequestContext } from '../container'
import { addStages, type StageLabel } from './work/read-models'

const CLOSED = new Set(['done_success', 'done_failure', 'cancelled'])

/** The initial and terminal stages of every visible workflow for this record type. */
export async function loadWorkflowStages(context: RequestContext, type: 'task' | 'lead') {
  const workflows = await context.payload.find({
    collection: 'workflows',
    where: { recordType: { equals: type } },
    pagination: false,
    limit: 0,
    depth: 0,
    overrideAccess: false,
    req: context.req,
  })
  const stages = new Map<string, StageLabel>()
  for (const workflow of workflows.docs) addStages(stages, workflow)
  return {
    stages,
    initial: workflows.docs.map((workflow) => workflow.defaultStageId),
    closed: [...stages].flatMap(([id, stage]) => (CLOSED.has(stage.category) ? [id] : [])),
  }
}
