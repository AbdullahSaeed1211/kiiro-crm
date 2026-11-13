import type { Where } from 'payload'
import { DAY_MS, todayAsDueAt } from '@ops/module-work'
import { isManagerUp } from '@ops/platform'
import { getWorkspaceSettings } from '../../auth/context'
import { normalizeLocale } from '../../../i18n/config'
import type { RequestContext } from '../../container'
import { loadPeople } from '../../people'
import { loadTaskContexts } from './tasks/task-contexts'
import { loadDashboardDayPlan } from './dashboard-day-plan'
import { dashboardTask } from './dashboard-task'
import { focusRow } from './dashboard-focus-row'
import type { DashboardCurrentFocus, DashboardWork, TaskSection } from './dashboard-model'
export type { DashboardCurrentFocus, DashboardPlanItem, DashboardTask, DashboardWork } from './dashboard-model'

import { loadWorkflowStages } from '../workflow-stages'
import { loadDashboardPresence } from './dashboard-presence'
const SHOWN = 5
const UPCOMING_DAYS = 14

const empty: TaskSection = { count: 0, items: [] }

async function taskSection(
  context: RequestContext,
  where: Where,
  options: Readonly<{ finishedStages?: readonly string[]; limit?: number }> = {},
): Promise<TaskSection> {
  const finishedStages = options.finishedStages ?? []
  const limit = options.limit ?? SHOWN
  const request = { collection: 'tasks' as const, where, overrideAccess: false, req: context.req }
  // The page's own total is the count, so the same rows are not counted twice.
  const page = await context.payload.find({
    ...request,
    sort: ['dueAt', 'id'],
    limit,
    depth: 0,
    select: {
      id: true,
      title: true,
      stageId: true,
      updatedAt: true,
      dueAt: true,
      project: true,
      relatedType: true,
      relatedId: true,
      assignees: true,
    },
  })
  return {
    count: page.totalDocs,
    items: page.docs.map((doc) => dashboardTask(doc, finishedStages)),
  }
}

async function enrich(
  context: RequestContext,
  sections: readonly TaskSection[],
  known: ReadonlyMap<string, { readonly name: string }>,
): Promise<TaskSection[]> {
  const tasks = sections.flatMap((section) => section.items)
  const assigneeIds = tasks.flatMap((task) => task.assigneeIds)
  // People already read for the scope are not read again for their own tasks.
  const missing = assigneeIds.filter((id) => !known.has(id))
  const [contexts, people] = await Promise.all([
    loadTaskContexts(context, tasks),
    missing.length === 0 ? Promise.resolve(new Map<string, { readonly name: string }>()) : loadPeople(context, missing),
  ])
  return sections.map((section) => ({
    ...section,
    items: section.items.map((task) => ({
      ...task,
      context: contexts.get(task.id)?.label ?? null,
      people: task.assigneeIds.flatMap((id) => known.get(id)?.name ?? people.get(id)?.name ?? []),
    })),
  }))
}

type DashboardScope = Omit<
  DashboardWork,
  'overdue' | 'dueToday' | 'upcoming' | 'plan' | 'planCandidates' | 'currentFocus' | 'presence' | 'refreshedAt'
>

async function teamPeople(context: RequestContext) {
  if (!isManagerUp(context.actor)) return []
  const result = await context.payload.find({
    collection: 'users',
    where: { active: { equals: true } },
    sort: ['name', 'id'],
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: false,
    req: context.req,
  })
  return result.docs.map((person) => ({ id: person.id, name: person.name }))
}

/** Presence exposes only names and a coarse activity signal, so managers see the tenant-wide active roster. */
function dashboardScope(
  settings: Awaited<ReturnType<typeof getWorkspaceSettings>>,
  context: RequestContext,
  selection: Readonly<{ requestedScope?: 'mine' | 'team'; personFilter: string }>,
): DashboardScope {
  const modules = settings.modules as Record<string, boolean> | null
  const timeZone = typeof settings.timezone === 'string' ? settings.timezone : 'UTC'
  const dayStart = todayAsDueAt(Date.now(), timeZone)
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

/** Work whose deadline falls in `[from, to)`, kept open by the caller's stage clauses. */
const dueWindow = (clauses: readonly Where[], from: number, to: number): Where => ({
  and: [...clauses, { dueAt: { greater_than_equal: from } }, { dueAt: { less_than: to } }],
})

async function dashboardQueues(context: RequestContext, scope: DashboardScope) {
  const workflow = await loadWorkflowStages(context, 'task')
  const finishedStages = workflow.closed
  const clauses: Where[] = [
    ...(workflow.closed.length ? [{ stageId: { not_in: workflow.closed } }] : []),
    ...taskOwnershipWhere(context, scope),
  ]
  const [overdue, dueToday, upcoming] = await Promise.all([
    taskSection(context, { and: [...clauses, { dueAt: { less_than: scope.dayStart } }] }),
    taskSection(context, dueWindow(clauses, scope.dayStart, scope.dayStart + DAY_MS)),
    taskSection(context, dueWindow(clauses, scope.dayStart + DAY_MS, scope.dayStart + UPCOMING_DAYS * DAY_MS)),
  ])
  const candidates = await candidateTasks(context, scope, finishedStages)
  const [plan, enriched, currentFocus, presence] = await Promise.all([
    loadDashboardDayPlan({
      context,
      scope,
      finishedStages,
      loadTasks: ({ context: taskContext, where, finishedStages: closed, limit }) =>
        taskSection(taskContext, where, { finishedStages: closed, limit }),
    }),
    enrich(context, [overdue, dueToday, upcoming], new Map(scope.people.map((person) => [person.id, person]))),
    loadCurrentFocus(context, scope, finishedStages),
    loadDashboardPresence(context),
  ])
  return {
    overdue: enriched[0] ?? empty,
    dueToday: enriched[1] ?? empty,
    upcoming: enriched[2] ?? empty,
    plan,
    planCandidates: candidates,
    currentFocus,
    presence,
  }
}

async function loadCurrentFocus(
  context: RequestContext,
  scope: DashboardScope,
  finishedStages: readonly string[],
): Promise<readonly DashboardCurrentFocus[]> {
  const userIds = scope.canSeeTeam ? scope.people.map((person) => person.id) : [scope.actorId]
  const focusWhere: Where = {
    and: [
      { user: { in: userIds } },
      { or: [{ startedAt: { greater_than_equal: scope.dayStart - DAY_MS } }, { user: { equals: scope.actorId } }] },
    ],
  }
  const page = await context.payload.find({
    collection: 'currentFocus',
    where: focusWhere,
    sort: ['startedAt', 'user'],
    limit: 100,
    depth: 0,
    // The collection keeps manager reads private by default. This team query is manager-gated,
    // constrains users to the active roster, and validates each linked task through taskSection.
    overrideAccess: isManagerUp(context.actor),
    req: context.req,
  })
  const rows = page.docs.flatMap((doc) => focusRow(doc, scope, Date.now()))
  const taskIds = [...new Set(rows.map((row) => row.taskId))]
  if (taskIds.length === 0) return []
  const openClause: Where[] = finishedStages.length ? [{ stageId: { not_in: finishedStages } }] : []
  const taskRows = await taskSection(
    context,
    { and: [{ id: { in: taskIds } }, ...openClause] },
    { finishedStages, limit: 100 },
  )
  const byTask = new Map(taskRows.items.map((task) => [String(task.id), task]))
  return rows.flatMap((row) => {
    const task = byTask.get(row.taskId)
    return task?.assigneeIds.includes(row.userId) ? [{ ...row, task }] : []
  })
}

async function candidateTasks(context: RequestContext, scope: DashboardScope, finishedStages: readonly string[]) {
  if (scope.team) return empty
  const where: Where = {
    and: [
      { assignees: { contains: String(context.actor.id) } },
      ...(finishedStages.length ? [{ stageId: { not_in: finishedStages } }] : []),
    ],
  }
  return taskSection(context, where, { finishedStages, limit: CANDIDATE_LIMIT })
}

const CANDIDATE_LIMIT = 100

export async function loadDashboardWork(
  context: RequestContext,
  requestedScope?: 'mine' | 'team',
  requestedPerson?: string,
): Promise<DashboardWork> {
  const [settings, people] = await Promise.all([getWorkspaceSettings(), teamPeople(context)])
  const canSelectPerson = isManagerUp(context.actor) && requestedScope === 'team'
  const personFilter = canSelectPerson ? authorizedPersonFilter(requestedPerson, people) : 'everyone'
  const scope = { ...dashboardScope(settings, context, { requestedScope, personFilter }), people }
  if (!scope.workEnabled)
    return {
      ...scope,
      overdue: empty,
      dueToday: empty,
      upcoming: empty,
      plan: { count: 0, items: [] },
      planCandidates: empty,
      currentFocus: [],
      presence: [],
      refreshedAt: Date.now(),
    }
  return { ...scope, ...(await dashboardQueues(context, scope)), refreshedAt: Date.now() }
}
