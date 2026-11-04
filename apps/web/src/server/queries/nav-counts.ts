import { todayAsDueAt } from '@ops/module-work'
import type { RequestContext } from '../container'
import { getWorkspaceSettings } from '../auth/context'
import { attentionLeadWhere } from './today-leads'
import { loadWorkflowStages } from './workflow-stages'

/** Counts the sidebar shows beside a link, keyed by the link's name. A missing key means "show nothing". */
export type NavCounts = Readonly<Partial<Record<'myTasks' | 'leads', number>>>

/**
 * Open tasks assigned to the viewer that are past due, and leads waiting on the viewer's next step. These are the same
 * queues Today shows, so the badge and the page always agree.
 */
export async function loadNavCounts(context: RequestContext): Promise<NavCounts> {
  const settings = await getWorkspaceSettings()
  const modules = { work: true, crm: true, ...(settings.modules as Record<string, boolean> | null) }
  const timeZone = typeof settings.timezone === 'string' ? settings.timezone : 'UTC'
  const dayStart = todayAsDueAt(Date.now(), timeZone)
  const [taskCount, leadCount] = await Promise.all([
    modules.work ? countOverdueTasks(context, dayStart) : 0,
    modules.crm ? countLeadsToFollowUp(context, dayStart) : 0,
  ])
  return { myTasks: taskCount, leads: leadCount }
}

async function countOverdueTasks(context: RequestContext, dayStart: number): Promise<number> {
  const workflow = await loadWorkflowStages(context, 'task')
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

async function countLeadsToFollowUp(context: RequestContext, dayStart: number): Promise<number> {
  const where = await attentionLeadWhere(context, dayStart, { scope: 'mine' })
  const result = await context.payload.count({ collection: 'leads', where, overrideAccess: false, req: context.req })
  return result.totalDocs
}
