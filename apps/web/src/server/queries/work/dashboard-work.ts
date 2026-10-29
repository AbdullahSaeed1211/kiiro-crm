import type { Where } from 'payload'
import { asId, type Id } from '@ops/kernel'
import { DAY_MS, todayAsDueAt, weekEndAfter } from '@ops/module-work'
import { isManagerUp } from '@ops/platform'
import { getWorkspaceSettings } from '../../auth/context'
import { normalizeLocale, type Locale } from '../../../i18n/config'
import type { RequestContext } from '../../container'
import { loadPeople } from '../../people'
import { loadTaskContexts } from './tasks/task-contexts'

import { loadWorkflowStages } from '../workflow-stages'
const SHOWN = 5

export interface DashboardTask {
  readonly id: Id
  readonly title: string
  readonly updatedAt: number
  readonly dueAt: number | null
  readonly projectId: Id | null
  readonly relatedType: string | null
  readonly relatedId: Id | null
  readonly assigneeIds: readonly string[]
  readonly context: string | null
  readonly people: readonly string[]
}
interface TaskSection {
  readonly count: number
  readonly items: readonly DashboardTask[]
}
export interface DashboardWork {
  readonly actorId: string
  readonly locale: Locale
  readonly timeZone: string
  readonly dayStart: number
  readonly canSeeTeam: boolean
  /** The active queue scope. Team scope is always clamped by the authenticated actor's role. */
  readonly team: boolean
  readonly personFilter: string
  readonly people: readonly { readonly id: string; readonly name: string }[]
  readonly crmEnabled: boolean
  readonly workEnabled: boolean
  readonly overdue: TaskSection
  readonly dueToday: TaskSection
  readonly dueWeek: TaskSection
}
const relation = (value: unknown): Id | null => (typeof value === 'string' ? asId(value) : null)
const empty: TaskSection = { count: 0, items: [] }

/** Reads only five rows and the exact count; the database applies the user's normal record scope. */
async function taskSection(context: RequestContext, where: Where): Promise<TaskSection> {
  const request = { collection: 'tasks' as const, where, overrideAccess: false, req: context.req }
  const [page, total] = await Promise.all([
    context.payload.find({
      ...request,
      sort: ['dueAt', 'id'],
      limit: SHOWN,
      depth: 0,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        dueAt: true,
        project: true,
        relatedType: true,
        relatedId: true,
        assignees: true,
      },
    }),
    context.payload.count(request),
  ])
  return {
    count: total.totalDocs,
    items: page.docs.map((doc) => ({
      id: asId(doc.id),
      title: doc.title,
      updatedAt: Date.parse(doc.updatedAt),
      dueAt: doc.dueAt ?? null,
      projectId: relation(doc.project),
      relatedType: doc.relatedType ?? null,
      relatedId: relation(doc.relatedId),
      assigneeIds: (doc.assignees ?? []).flatMap((id) => (typeof id === 'string' ? [id] : [])),
      context: null,
      people: [],
    })),
  }
}

async function enrich(context: RequestContext, sections: readonly TaskSection[]): Promise<TaskSection[]> {
  const tasks = sections.flatMap((section) => section.items)
  const [contexts, people] = await Promise.all([
    loadTaskContexts(context, tasks),
    loadPeople(
      context,
      tasks.flatMap((task) => task.assigneeIds),
    ),
  ])
  return sections.map((section) => ({
    ...section,
    items: section.items.map((task) => ({
      ...task,
      context: contexts.get(task.id)?.label ?? null,
      people: task.assigneeIds.flatMap((id) => people.get(id)?.name ?? []),
    })),
  }))
}

type DashboardScope = Omit<DashboardWork, 'overdue' | 'dueToday' | 'dueWeek'> & { readonly weekEnd: number }

async function teamPeople(context: RequestContext) {
  if (!isManagerUp(context.actor)) return []
  const where: Where = {
    and: [
      { active: { equals: true } },
      ...(context.actor.role === 'owner' ? [] : [{ id: { in: context.actor.reportIds.map(String) } }]),
    ],
  }
  const result = await context.payload.find({
    collection: 'users',
    where,
    sort: ['name', 'id'],
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: false,
    req: context.req,
  })
  return result.docs.map((person) => ({ id: person.id, name: person.name }))
}

function dashboardScope(
  settings: Awaited<ReturnType<typeof getWorkspaceSettings>>,
  context: RequestContext,
  selection: Readonly<{ requestedScope?: 'mine' | 'team'; personFilter: string }>,
): DashboardScope {
  const modules = settings.modules as Record<string, boolean> | null
  const timeZone = typeof settings.timezone === 'string' ? settings.timezone : 'UTC'
  const dayStart = todayAsDueAt(Date.now(), timeZone)
  const weekStart = settings.weekStartsOn === 0 ? 0 : 1
  const canSeeTeam = isManagerUp(context.actor)
  return {
    locale: normalizeLocale(settings.locale),
    actorId: String(context.actor.id),
    timeZone,
    dayStart,
    canSeeTeam,
    team: canSeeTeam && selection.requestedScope === 'team',
    personFilter: selection.personFilter,
    people: [],
    crmEnabled: modules?.crm !== false,
    workEnabled: modules?.work !== false,
    weekEnd: weekEndAfter(dayStart, weekStart),
  }
}

function authorizedPersonFilter(requested: string | undefined, people: DashboardWork['people']): string {
  if (requested === 'unassigned') return requested
  if (requested !== undefined && requested !== 'everyone' && people.some((person) => person.id === requested))
    return requested
  return 'everyone'
}

function taskOwnershipWhere(context: RequestContext, scope: DashboardScope): Where[] {
  if (!scope.team) return [{ assignees: { contains: String(context.actor.id) } }]
  if (scope.personFilter === 'everyone') return []
  if (scope.personFilter === 'unassigned') return [{ assignees: { exists: false } }]
  return [{ assignees: { contains: scope.personFilter } }]
}

async function dashboardQueues(context: RequestContext, scope: DashboardScope) {
  const workflow = await loadWorkflowStages(context, 'task')
  const clauses: Where[] = [
    ...(workflow.closed.length ? [{ stageId: { not_in: workflow.closed } }] : []),
    ...taskOwnershipWhere(context, scope),
  ]
  const [overdue, dueToday, dueWeek] = await Promise.all([
    taskSection(context, { and: [...clauses, { dueAt: { less_than: scope.dayStart } }] }),
    taskSection(context, {
      and: [
        ...clauses,
        { dueAt: { greater_than_equal: scope.dayStart } },
        { dueAt: { less_than: scope.dayStart + DAY_MS } },
      ],
    }),
    taskSection(context, {
      and: [
        ...clauses,
        { dueAt: { greater_than_equal: scope.dayStart + DAY_MS } },
        { dueAt: { less_than: scope.weekEnd } },
      ],
    }),
  ])
  const enriched = await enrich(context, [overdue, dueToday, dueWeek])
  return { overdue: enriched[0] ?? empty, dueToday: enriched[1] ?? empty, dueWeek: enriched[2] ?? empty }
}

/** Every dashboard starts with personal queues; authorized managers may select a team scope. */
export async function loadDashboardWork(
  context: RequestContext,
  requestedScope?: 'mine' | 'team',
  requestedPerson?: string,
): Promise<DashboardWork> {
  const [settings, people] = await Promise.all([getWorkspaceSettings(), teamPeople(context)])
  const canSelectPerson = isManagerUp(context.actor) && requestedScope === 'team'
  const personFilter = canSelectPerson ? authorizedPersonFilter(requestedPerson, people) : 'everyone'
  const scope = { ...dashboardScope(settings, context, { requestedScope, personFilter }), people }
  if (!scope.workEnabled) return { ...scope, overdue: empty, dueToday: empty, dueWeek: empty }
  return { ...scope, ...(await dashboardQueues(context, scope)) }
}
