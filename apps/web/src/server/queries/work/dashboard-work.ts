import type { Where } from 'payload'
import { getWorkspaceSettings } from '../../auth/context'
import { normalizeLocale, type Locale } from '../../../i18n/config'
import type { RequestContext } from '../../container'

const CLOSED = new Set(['done_success', 'done_failure', 'cancelled'])
const SHOWN = 5
const DAY_MS = 86_400_000
const WEEK_MS = 7 * DAY_MS

interface Stage {
  readonly id: string
  readonly name: string
  readonly category: string
}

interface DashboardTask {
  readonly id: string
  readonly title: string
  readonly dueAt: number | null
}

export interface DashboardWork {
  readonly locale: Locale
  readonly timeZone: string
  readonly mine: number
  readonly open: number
  readonly overdue: { readonly count: number; readonly items: readonly DashboardTask[] }
  readonly today: { readonly count: number; readonly items: readonly DashboardTask[] }
  readonly dueWeek: { readonly count: number; readonly items: readonly DashboardTask[] }
  readonly projects: {
    readonly count: number
    readonly items: readonly { readonly id: string; readonly name: string; readonly stage: string }[]
  }
}

/** Start of the current day in `timeZone`, as epoch milliseconds. */
function startOfDay(now: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(now)
  const at = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0)
  const wallClock = Date.UTC(at('year'), at('month') - 1, at('day'), at('hour'), at('minute'), at('second'))
  const offset = wallClock - Math.floor(now / 1000) * 1000
  return Date.UTC(at('year'), at('month') - 1, at('day')) - offset
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '')

/** Every stage of the task and project workflows, by recordType, so closed ones can be left out of the counts. */
async function stagesByType(context: RequestContext): Promise<ReadonlyMap<string, readonly Stage[]>> {
  const found = await context.payload.find({
    collection: 'workflows',
    where: { recordType: { in: ['task', 'project'] } },
    limit: 10,
    depth: 0,
    overrideAccess: false,
    req: context.req,
  })
  const byType = new Map<string, Stage[]>()
  for (const workflow of found.docs) {
    const stages = (Array.isArray(workflow.stages) ? workflow.stages : []).flatMap((row: unknown) => {
      const stage = row as { id?: unknown; name?: unknown; category?: unknown }
      return typeof stage.id === 'string'
        ? [{ id: stage.id, name: text(stage.name), category: text(stage.category) }]
        : []
    })
    byType.set(workflow.recordType, [...(byType.get(workflow.recordType) ?? []), ...stages])
  }
  return byType
}

const openWhere = (closed: readonly string[], extra: Where[]): Where => ({
  and: [...extra, ...(closed.length === 0 ? [] : [{ stageId: { not_in: closed } }])],
})

const count = (context: RequestContext, collection: 'tasks' | 'projects', where: Where) =>
  context.payload.count({ collection, where, overrideAccess: false, req: context.req })

interface TaskSection {
  readonly count: number
  readonly items: readonly DashboardTask[]
}

/** The total and the first few tasks matching `where`, soonest due first. */
async function taskSection(context: RequestContext, where: Where): Promise<TaskSection> {
  const [page, total] = await Promise.all([
    context.payload.find({
      collection: 'tasks',
      where,
      sort: 'dueAt',
      limit: SHOWN,
      select: { id: true, title: true, dueAt: true },
      depth: 0,
      overrideAccess: false,
      req: context.req,
    }),
    count(context, 'tasks', where),
  ])
  return {
    count: total.totalDocs,
    items: page.docs.map((doc) => ({ id: doc.id, title: doc.title, dueAt: doc.dueAt ?? null })),
  }
}

async function projectSection(context: RequestContext, stages: readonly Stage[]): Promise<DashboardWork['projects']> {
  const closed = stages.filter((stage) => CLOSED.has(stage.category)).map((stage) => stage.id)
  const where = openWhere(closed, [])
  const names = new Map(stages.map((stage) => [stage.id, stage.name]))
  const [page, total] = await Promise.all([
    context.payload.find({
      collection: 'projects',
      where,
      sort: 'name',
      limit: SHOWN,
      select: { id: true, name: true, stageId: true },
      depth: 0,
      overrideAccess: false,
      req: context.req,
    }),
    count(context, 'projects', where),
  ])
  return {
    count: total.totalDocs,
    items: page.docs.map((project) => ({
      id: project.id,
      name: project.name,
      stage: names.get(text(project.stageId)) ?? '',
    })),
  }
}

/**
 * What the dashboard shows, read as counts and five-row lists instead of loading every task and project: the signed-in
 * user's open and overdue tasks, tasks due this week, and active projects.
 */
export async function loadDashboardWork(context: RequestContext): Promise<DashboardWork> {
  const [stages, settings] = await Promise.all([stagesByType(context), getWorkspaceSettings()])
  const closed = (stages.get('task') ?? []).filter((stage) => CLOSED.has(stage.category)).map((stage) => stage.id)
  const me = String(context.actor.id)
  const now = Date.now()
  const timeZone = text(settings.timezone) || 'UTC'
  const dayStart = startOfDay(now, timeZone)
  const mine = [{ assignees: { contains: me } }]
  const week = [{ dueAt: { greater_than_equal: now } }, { dueAt: { less_than_equal: now + WEEK_MS } }]
  const [mineCount, openCount, overdue, today, dueWeek, projects] = await Promise.all([
    count(context, 'tasks', openWhere(closed, mine)),
    count(context, 'tasks', openWhere(closed, [])),
    taskSection(context, openWhere(closed, [...mine, { dueAt: { less_than: dayStart } }])),
    taskSection(
      context,
      openWhere(closed, [
        ...mine,
        { dueAt: { greater_than_equal: dayStart } },
        { dueAt: { less_than: dayStart + DAY_MS } },
      ]),
    ),
    taskSection(context, openWhere(closed, week)),
    projectSection(context, stages.get('project') ?? []),
  ])
  return {
    locale: normalizeLocale(settings.locale),
    timeZone,
    mine: mineCount.totalDocs,
    open: openCount.totalDocs,
    overdue,
    today,
    dueWeek,
    projects,
  }
}
