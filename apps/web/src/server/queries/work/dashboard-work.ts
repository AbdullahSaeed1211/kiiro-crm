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
import type { DashboardWork, TaskSection } from './dashboard-model'
export type { DashboardPlanItem, DashboardTask, DashboardWork } from './dashboard-model'

import { loadWorkflowStages } from '../workflow-stages'
const SHOWN = 5

const empty: TaskSection = { count: 0, items: [] }

/** Reads only five rows and the exact count; the database applies the user's normal record scope. */
async function taskSection(
  context: RequestContext,
  where: Where,
  options: Readonly<{ finishedStages?: readonly string[]; limit?: number }> = {},
): Promise<TaskSection> {
  const finishedStages = options.finishedStages ?? []
  const limit = options.limit ?? SHOWN
  const request = { collection: 'tasks' as const, where, overrideAccess: false, req: context.req }
  const [page, total] = await Promise.all([
    context.payload.find({
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
    }),
    context.payload.count(request),
  ])
  return {
    count: total.totalDocs,
    items: page.docs.map((doc) => dashboardTask(doc, finishedStages)),
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

type DashboardScope = Omit<DashboardWork, 'overdue' | 'dueToday' | 'plan' | 'planCandidates'>

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

async function dashboardQueues(context: RequestContext, scope: DashboardScope) {
  const workflow = await loadWorkflowStages(context, 'task')
  const finishedStages = workflow.closed
  const clauses: Where[] = [
    ...(workflow.closed.length ? [{ stageId: { not_in: workflow.closed } }] : []),
    ...taskOwnershipWhere(context, scope),
  ]
  const [overdue, dueToday] = await Promise.all([
    taskSection(context, { and: [...clauses, { dueAt: { less_than: scope.dayStart } }] }),
    taskSection(context, {
      and: [
        ...clauses,
        { dueAt: { greater_than_equal: scope.dayStart } },
        { dueAt: { less_than: scope.dayStart + DAY_MS } },
      ],
    }),
  ])
  const candidates = await candidateTasks(context, scope, finishedStages)
  const [plan, enriched] = await Promise.all([
    loadDashboardDayPlan({
      context,
      scope,
      finishedStages,
      loadTasks: ({ context: taskContext, where, finishedStages: closed, limit }) =>
        taskSection(taskContext, where, { finishedStages: closed, limit }),
    }),
    enrich(context, [overdue, dueToday]),
  ])
  return {
    overdue: enriched[0] ?? empty,
    dueToday: enriched[1] ?? empty,
    plan,
    planCandidates: candidates,
  }
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
    return { ...scope, overdue: empty, dueToday: empty, plan: { count: 0, items: [] }, planCandidates: empty }
  return { ...scope, ...(await dashboardQueues(context, scope)) }
}
