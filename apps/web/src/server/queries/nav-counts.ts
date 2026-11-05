import { todayAsDueAt } from '@ops/module-work'
import type { RequestContext } from '../container'
import { getWorkspaceSettings } from '../auth/context'
import { attentionLeadWhere } from './today-leads'
import { loadWorkflowStages } from './workflow-stages'

/** Counts the sidebar shows beside a link, keyed by the link's name. A missing key means "show nothing". */
export type NavCounts = Readonly<Partial<Record<'myTasks' | 'leads', number>>>

type Workflow = Awaited<ReturnType<typeof loadWorkflowStages>>

// Workflows change rarely and only decide which stages count as finished here, so a badge may use a minute-old copy.
// Each Worker serves one tenant, so the copy is never shared between workspaces.
const WORKFLOW_TTL_MS = 60_000
const workflowCache = new Map<'task' | 'lead', { at: number; workflow: Promise<Workflow> }>()

function cachedWorkflow(context: RequestContext, type: 'task' | 'lead'): Promise<Workflow> {
  const hit = workflowCache.get(type)
  if (hit !== undefined && Date.now() - hit.at < WORKFLOW_TTL_MS) return hit.workflow
  const workflow = loadWorkflowStages(context, type)
  workflowCache.set(type, { at: Date.now(), workflow })
  // A failed load must not be remembered.
  workflow.catch(() => workflowCache.delete(type))
  return workflow
}

/**
 * Open tasks assigned to the viewer that are past due, and leads waiting on the viewer's next step. These are the same
 * queues Today shows. Everything independent starts together: the settings and workflows, then the two counts.
 */
export async function loadNavCounts(context: RequestContext): Promise<NavCounts> {
  const [settings, taskWorkflow, leadWorkflow] = await Promise.all([
    getWorkspaceSettings(),
    cachedWorkflow(context, 'task'),
    cachedWorkflow(context, 'lead'),
  ])
  const modules = { work: true, crm: true, ...(settings.modules as Record<string, boolean> | null) }
  const timeZone = typeof settings.timezone === 'string' ? settings.timezone : 'UTC'
  const dayStart = todayAsDueAt(Date.now(), timeZone)
  const [myTasks, leads] = await Promise.all([
    modules.work ? countOverdueTasks(context, dayStart, taskWorkflow) : 0,
    modules.crm ? countLeadsToFollowUp(context, dayStart, leadWorkflow) : 0,
  ])
  return { myTasks, leads }
}

async function countOverdueTasks(context: RequestContext, dayStart: number, workflow: Workflow): Promise<number> {
  const result = await context.payload.count({
    collection: 'tasks',
    where: {
      and: [
        ...(workflow.closed.length ? [{ stageId: { not_in: workflow.closed } }] : []),
        { assignees: { contains: String(context.actor.id) } },
        { dueAt: { less_than: dayStart } },
      ],
    },
    overrideAccess: false,
    req: context.req,
  })
  return result.totalDocs
}

async function countLeadsToFollowUp(context: RequestContext, dayStart: number, workflow: Workflow): Promise<number> {
  const where = await attentionLeadWhere(context, dayStart, { scope: 'mine', workflow })
  const result = await context.payload.count({ collection: 'leads', where, overrideAccess: false, req: context.req })
  return result.totalDocs
}
