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
  readonly locale: Locale
  readonly timeZone: string
  readonly dayStart: number
  readonly canSeeTeam: boolean
  /** The active queue scope. Team scope is always clamped by the authenticated actor's role. */
  readonly team: boolean
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

function dashboardScope(
  settings: Awaited<ReturnType<typeof getWorkspaceSettings>>,
  context: RequestContext,
  requestedScope?: 'mine' | 'team',
): DashboardScope {
  const modules = settings.modules as Record<string, boolean> | null
  const timeZone = typeof settings.timezone === 'string' ? settings.timezone : 'UTC'
  const dayStart = todayAsDueAt(Date.now(), timeZone)
  const weekStart = settings.weekStartsOn === 0 ? 0 : 1
  const canSeeTeam = isManagerUp(context.actor)
  return {
    locale: normalizeLocale(settings.locale),
    timeZone,
    dayStart,
    canSeeTeam,
    team: canSeeTeam && requestedScope !== 'mine',
    crmEnabled: modules?.crm !== false,
    workEnabled: modules?.work !== false,
    weekEnd: weekEndAfter(dayStart, weekStart),
  }
}

async function dashboardQueues(context: RequestContext, scope: DashboardScope) {
  const workflow = await loadWorkflowStages(context, 'task')
  const clauses: Where[] = [
    ...(workflow.closed.length ? [{ stageId: { not_in: workflow.closed } }] : []),
    ...(scope.team ? [] : [{ assignees: { contains: String(context.actor.id) } }]),
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

/** Owners default to team queues; any personal selection narrows tasks to the authenticated user. */
export async function loadDashboardWork(
  context: RequestContext,
  requestedScope?: 'mine' | 'team',
): Promise<DashboardWork> {
  const scope = dashboardScope(await getWorkspaceSettings(), context, requestedScope)
  if (!scope.workEnabled) return { ...scope, overdue: empty, dueToday: empty, dueWeek: empty }
  return { ...scope, ...(await dashboardQueues(context, scope)) }
}
