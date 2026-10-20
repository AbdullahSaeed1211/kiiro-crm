import type { Where } from 'payload'
import type { RequestContext } from '../container'
import { loadPeople } from '../people'

import { loadWorkflowStages } from './workflow-stages'
const SHOWN = 5
const DAY_MS = 86_400_000

/** Shared by the Today summary and its paginated drill-down so both describe the same lead queue. */
export async function attentionLeadWhere(context: RequestContext, dayStart: number): Promise<Where> {
  const workflow = await loadWorkflowStages(context, 'lead')
  const team = context.actor.role === 'owner' || context.actor.role === 'manager'
  return {
    and: [
      ...(workflow.closed.length ? [{ stageId: { not_in: workflow.closed } }] : []),
      ...(team ? [] : [{ owner: { equals: String(context.actor.id) } }]),
      { or: [{ nextActionAt: { less_than: dayStart + DAY_MS } }, { stageId: { in: workflow.initial } }] },
    ],
  }
}

/** Open leads waiting in the first stage, or with a next action due by today. Counts are never capped to a list page. */
export async function loadTodayLeads(context: RequestContext, dayStart: number) {
  const request = { depth: 0, overrideAccess: false, req: context.req }
  const where = await attentionLeadWhere(context, dayStart)
  const [page, total] = await Promise.all([
    context.payload.find({
      collection: 'leads',
      ...request,
      where,
      sort: ['createdAt', 'id'],
      limit: SHOWN,
      select: { title: true, companyName: true, email: true, owner: true },
    }),
    context.payload.count({ collection: 'leads', where, overrideAccess: false, req: context.req }),
  ])
  const people = await loadPeople(
    context,
    page.docs.flatMap((lead) => (typeof lead.owner === 'string' ? [lead.owner] : [])),
  )
  return {
    count: total.totalDocs,
    items: page.docs.map((lead) => ({
      id: lead.id,
      title: lead.title,
      company: lead.companyName ?? lead.email ?? null,
      owner: typeof lead.owner === 'string' ? (people.get(lead.owner)?.name ?? null) : null,
    })),
    href: '/leads/follow-ups?attention=1',
  }
}
