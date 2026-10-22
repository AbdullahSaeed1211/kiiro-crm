import { todayAsDueAt } from '@ops/module-work'
import type { Where } from 'payload'
import { getWorkspaceSettings } from '../../auth/context'
import type { RequestContext } from '../../container'
import { loadWorkflowStages } from '../../queries/workflow-stages'

export interface OrganizationReadiness {
  readonly overdueTaskCount: number
  readonly pendingApprovalCount: number
}

function linkedTaskWhere(organizationId: string, visibleProjectIds: readonly string[]): Where {
  return {
    or: [
      { and: [{ relatedType: { equals: 'organization' } }, { relatedId: { equals: organizationId } }] },
      ...(visibleProjectIds.length === 0 ? [] : [{ project: { in: [...visibleProjectIds] } }]),
    ],
  }
}

export async function organizationReadiness(
  context: RequestContext,
  organizationId: string,
  visibleProjectIds: readonly string[],
): Promise<OrganizationReadiness> {
  const [workflow, settings] = await Promise.all([loadWorkflowStages(context, 'task'), getWorkspaceSettings()])
  const timeZone = typeof settings.timezone === 'string' ? settings.timezone : 'UTC'
  const today = todayAsDueAt(Date.now(), timeZone)
  const open: Where[] = [
    linkedTaskWhere(organizationId, visibleProjectIds),
    { completedAt: { equals: null } },
    ...(workflow.closed.length === 0 ? [] : [{ stageId: { not_in: [...workflow.closed] } }]),
  ]
  const [overdueTasks, pendingApprovals] = await Promise.all([
    context.payload.count({
      collection: 'tasks',
      where: { and: [...open, { dueAt: { less_than: today } }] },
      overrideAccess: false,
      user: context.req.user,
      req: context.req,
    }),
    visibleProjectIds.length === 0
      ? Promise.resolve({ totalDocs: 0 })
      : context.payload.count({
          collection: 'deliverables',
          where: { and: [{ project: { in: [...visibleProjectIds] } }, { status: { equals: 'sent_to_client' } }] },
          overrideAccess: false,
          user: context.req.user,
          req: context.req,
        }),
  ])
  return { overdueTaskCount: overdueTasks.totalDocs, pendingApprovalCount: pendingApprovals.totalDocs }
}
