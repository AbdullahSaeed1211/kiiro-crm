import { todayAsDueAt } from '@ops/module-work'
import type { Where } from 'payload'
import { getWorkspaceSettings } from '../auth/context'
import { normalizeLocale, type Locale } from '../../i18n/config'
import type { RequestContext } from '@/server/container'
import type { ReportRange } from './report-range'

const FINISHED = new Set(['done_success', 'done_failure', 'cancelled'])

/** What the figures count for tasks: due in the range and still open, finished in the range, and open past their date. */
interface TaskCounts {
  readonly openTasks: number
  readonly completedTasks: number
  readonly overdueTasks: number
}

export interface TaskFigures {
  readonly totals: TaskCounts
  /** Counts per person; the `null` key holds tasks nobody is assigned to. */
  readonly byOwner: ReadonlyMap<string | null, TaskCounts>
  readonly people: ReadonlyMap<string, string>
  readonly locale: Locale
  readonly timeZone: string
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '')

async function finishedStages(context: RequestContext): Promise<string[]> {
  const found = await context.payload.find({
    collection: 'workflows',
    where: { recordType: { equals: 'task' } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    req: context.req,
  })
  const stages: unknown[] = Array.isArray(found.docs[0]?.stages) ? found.docs[0].stages : []
  return stages.flatMap((row) => {
    const stage = row as { id?: unknown; category?: unknown }
    return typeof stage.id === 'string' && FINISHED.has(text(stage.category)) ? [stage.id] : []
  })
}

const between = (field: 'dueAt' | 'completedAt', from: number, to: number): Where => ({
  and: [{ [field]: { greater_than_equal: from } }, { [field]: { less_than: to } }],
})

interface TaskRow {
  readonly stageId?: unknown
  readonly dueAt?: unknown
  readonly completedAt?: unknown
  readonly assignees?: unknown
}

const inRange = (value: unknown, from: number, to: number): boolean =>
  typeof value === 'number' && value >= from && value < to

/** What one task adds to the counts: due and open, finished in the range, and open past its date. */
function countTask(
  row: TaskRow,
  input: { range: ReportRange; today: number; finished: ReadonlySet<string> },
): TaskCounts {
  const { range, today, finished } = input
  const open = !finished.has(text(row.stageId))
  return {
    openTasks: open && inRange(row.dueAt, range.from, range.to) ? 1 : 0,
    completedTasks: inRange(row.completedAt, range.from, range.to) ? 1 : 0,
    // Overdue means due before today's date, so a task due today is not late yet.
    overdueTasks: open && inRange(row.dueAt, range.from, Math.min(range.to, today)) ? 1 : 0,
  }
}

const add = (a: TaskCounts | undefined, b: TaskCounts): TaskCounts => ({
  openTasks: (a?.openTasks ?? 0) + b.openTasks,
  completedTasks: (a?.completedTasks ?? 0) + b.completedTasks,
  overdueTasks: (a?.overdueTasks ?? 0) + b.overdueTasks,
})

/** Counts per assignee (`null` for nobody) and overall, from the tasks that touch the range. */
function tally(rows: readonly TaskRow[], input: { range: ReportRange; today: number; finished: ReadonlySet<string> }) {
  let totals = add(undefined, { openTasks: 0, completedTasks: 0, overdueTasks: 0 })
  const byOwner = new Map<string | null, TaskCounts>()
  for (const row of rows) {
    const counts = countTask(row, input)
    totals = add(totals, counts)
    const owners = Array.isArray(row.assignees)
      ? row.assignees.filter((id): id is string => typeof id === 'string')
      : []
    for (const owner of owners.length > 0 ? owners : [null]) byOwner.set(owner, add(byOwner.get(owner), counts))
  }
  return { totals, byOwner }
}

const empty = (counts: TaskCounts): boolean =>
  counts.openTasks === 0 && counts.completedTasks === 0 && counts.overdueTasks === 0

/** The tasks due or finished in the range, with only the four fields the counts need. */
function tasksInRange(context: RequestContext, range: ReportRange) {
  return context.payload.find({
    collection: 'tasks',
    where: { or: [between('dueAt', range.from, range.to), between('completedAt', range.from, range.to)] },
    select: { stageId: true, dueAt: true, completedAt: true, assignees: true },
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: false,
    req: context.req,
  })
}

/**
 * Task figures for the report from one query: the tasks due or finished in the range, with only the four fields the
 * counts need. This replaced about three count queries per person, which cost 25 queries and over two seconds for six
 * people; the one query grows with the tasks in the range, not with the people.
 */
export async function loadTaskFigures(
  context: RequestContext,
  input: { range: ReportRange; now: number },
): Promise<TaskFigures> {
  const { range } = input
  const [finished, settings, users, tasks] = await Promise.all([
    finishedStages(context),
    getWorkspaceSettings(),
    context.payload.find({
      collection: 'users',
      select: { name: true },
      limit: 0,
      pagination: false,
      depth: 0,
      overrideAccess: false,
      req: context.req,
    }),
    tasksInRange(context, range),
  ])
  const people = new Map(users.docs.map((user) => [user.id, user.name]))
  const timeZone = text(settings.timezone) || 'UTC'
  const { totals, byOwner } = tally(tasks.docs, {
    range,
    today: todayAsDueAt(input.now, timeZone),
    finished: new Set(finished),
  })
  return {
    totals,
    byOwner: new Map([...byOwner].filter(([, counts]) => !empty(counts))),
    people,
    locale: normalizeLocale(settings.locale),
    timeZone,
  }
}
