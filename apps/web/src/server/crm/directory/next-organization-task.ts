import type { RequestContext } from '../../container'
import { loadWorkflowStages } from '../../queries/workflow-stages'
import type { Where } from 'payload'
import type { RelatedTask } from './types'
import { text } from './normalize'

function whereFor(
  organizationId: string,
  visibleProjectIds: readonly string[],
  closedStageIds: readonly string[],
): Where {
  const linkedRecords: Where[] = [
    { and: [{ relatedType: { equals: 'organization' } }, { relatedId: { equals: organizationId } }] },
    ...(visibleProjectIds.length > 0 ? [{ project: { in: [...visibleProjectIds] } }] : []),
  ]
  return {
    and: [
      { or: linkedRecords },
      { dueAt: { exists: true } },
      { completedAt: { equals: null } },
      ...(closedStageIds.length > 0 ? [{ stageId: { not_in: [...closedStageIds] } }] : []),
    ],
  }
}

function mapNextTask(
  task:
    | {
        id: string
        title: string
        priority?: string | null
        dueAt?: number | null
        completedAt?: number | null
      }
    | undefined,
) {
  if (task === undefined || typeof task.dueAt !== 'number') return null
  const title = text(task.title)
  if (title === null) return null
  return {
    id: task.id,
    title,
    priority: text(task.priority) ?? 'none',
    dueAt: task.dueAt,
    completedAt: typeof task.completedAt === 'number' ? task.completedAt : null,
  } satisfies RelatedTask
}

/** Earliest open, dated task directly linked to an organization or to one of its visible projects. */
export async function nextOrganizationTask(
  context: RequestContext,
  organizationId: string,
  visibleProjectIds: readonly string[],
): Promise<RelatedTask | null> {
  const workflow = await loadWorkflowStages(context, 'task')
  const found = await context.payload.find({
    collection: 'tasks',
    where: whereFor(organizationId, visibleProjectIds, workflow.closed),
    sort: ['dueAt', 'id'],
    limit: 1,
    page: 1,
    pagination: true,
    depth: 0,
    select: { id: true, title: true, priority: true, dueAt: true, completedAt: true },
    overrideAccess: false,
    user: context.req.user,
    req: context.req,
  })
  return mapNextTask(found.docs.at(0))
}
