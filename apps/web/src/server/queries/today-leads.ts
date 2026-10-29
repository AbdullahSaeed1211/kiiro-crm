import type { Where } from 'payload'
import type { RequestContext } from '../container'
import { loadPeople, type PersonSummary } from '../people'
import { loadWorkflowStages } from './workflow-stages'
import { todayLeadScope } from './today-lead-scope'

const SHOWN = 5
const DAY_MS = 86_400_000
type TodayLeadFilter = Readonly<{ scope?: 'mine' | 'team'; person?: string }>
type TodayLeadDoc = Readonly<{
  id: string
  title: string
  companyName?: string | null
  email?: string | null
  owner?: unknown
  assignees?: readonly unknown[] | null
  nextActionAt?: number | null
}>

function viewAllHref(team: boolean, person: string): string {
  if (!team) return '/leads/follow-ups?attention=1&person=me'
  if (person === 'everyone') return '/leads/follow-ups?attention=1'
  return `/leads/follow-ups?attention=1&person=${encodeURIComponent(person)}`
}

/** Shared by the Today summary and its paginated drill-down so both describe the same lead queue. */
export async function attentionLeadWhere(
  context: RequestContext,
  dayStart: number,
  filter: TodayLeadFilter = {},
): Promise<Where> {
  const workflow = await loadWorkflowStages(context, 'lead')
  const scope = todayLeadScope(context.actor, filter.scope !== 'mine', filter.person ?? 'everyone')
  return {
    and: [
      ...(workflow.closed.length ? [{ stageId: { not_in: workflow.closed } }] : []),
      ...(scope.ownership === undefined ? [] : [scope.ownership]),
      { or: [{ nextActionAt: { less_than: dayStart + DAY_MS } }, { stageId: { in: workflow.initial } }] },
    ],
  }
}

/** Open leads waiting in the first stage or with a next action due by today. Counts are never capped to a list page. */
export async function loadTodayLeads(
  context: RequestContext,
  dayStart: number,
  requested: Readonly<{ team: boolean; person: string }>,
) {
  const scope = todayLeadScope(context.actor, requested.team, requested.person)
  const person = scope.team ? requested.person : 'everyone'
  const where = await attentionLeadWhere(context, dayStart, { scope: scope.team ? 'team' : 'mine', person })
  const request = { depth: 0, overrideAccess: false, req: context.req }
  const [page, total] = await Promise.all([
    context.payload.find({
      collection: 'leads',
      ...request,
      where,
      sort: ['nextActionAt', 'createdAt', 'id'],
      limit: SHOWN,
      select: { title: true, companyName: true, email: true, owner: true, assignees: true, nextActionAt: true },
    }),
    context.payload.count({ collection: 'leads', where, overrideAccess: false, req: context.req }),
  ])
  const people = await loadPeople(context, page.docs.flatMap(leadPersonIds))
  return {
    count: total.totalDocs,
    items: todayLeadItems(page.docs, people),
    personHref: viewAllHref(scope.team, person),
  }
}

function leadPersonIds(lead: TodayLeadDoc): string[] {
  return [
    ...(typeof lead.owner === 'string' ? [lead.owner] : []),
    ...(lead.assignees ?? []).flatMap((id) => (typeof id === 'string' ? [id] : [])),
  ]
}

function todayLeadItems(docs: readonly TodayLeadDoc[], people: ReadonlyMap<string, PersonSummary>) {
  return docs.map((lead) => ({
    id: lead.id,
    title: lead.title,
    company: lead.companyName ?? lead.email ?? null,
    owner: typeof lead.owner === 'string' ? (people.get(lead.owner)?.name ?? null) : null,
    people: (lead.assignees ?? []).flatMap((id) => (typeof id === 'string' ? (people.get(id)?.name ?? []) : [])),
    dueAt: lead.nextActionAt ?? null,
  }))
}
