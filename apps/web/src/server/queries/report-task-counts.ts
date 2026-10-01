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

/** Counts for tasks matching `owner`: one person, nobody (`null`), or everyone (`undefined`). */
async function countsFor(
  context: RequestContext,
  input: { owner: string | null | undefined; range: ReportRange; now: number; finished: readonly string[] },
): Promise<TaskCounts> {
  const { owner, range, now, finished } = input
  const who: Where[] =
    owner === undefined ? [] : [owner === null ? { assignees: { exists: false } } : { assignees: { contains: owner } }]
  const open: Where[] = finished.length === 0 ? [] : [{ stageId: { not_in: finished } }]
  const count = async (...clauses: Where[]): Promise<number> =>
    (
      await context.payload.count({
        collection: 'tasks',
        where: { and: [...who, ...clauses] },
        overrideAccess: false,
        req: context.req,
      })
    ).totalDocs
  const [openTasks, completedTasks, overdueTasks] = await Promise.all([
    count(...open, between('dueAt', range.from, range.to)),
    count(between('completedAt', range.from, range.to)),
    count(...open, between('dueAt', range.from, Math.min(range.to, now))),
  ])
  return { openTasks, completedTasks, overdueTasks }
}

const empty = (counts: TaskCounts): boolean =>
  counts.openTasks === 0 && counts.completedTasks === 0 && counts.overdueTasks === 0

/**
 * Task figures for the report, as a handful of count queries per person instead of reading every task, so the report
 * costs about the same with six thousand tasks as with sixty.
 */
export async function loadTaskFigures(
  context: RequestContext,
  input: { range: ReportRange; now: number },
): Promise<TaskFigures> {
  const [finished, settings, users] = await Promise.all([
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
  ])
  const people = new Map(users.docs.map((user) => [user.id, user.name]))
  const run = (owner: string | null | undefined) => countsFor(context, { owner, finished, ...input })
  const owners: (string | null)[] = [...people.keys(), null]
  const [everyone, each] = await Promise.all([run(undefined), Promise.all(owners.map(run))])
  return {
    totals: everyone,
    byOwner: new Map(owners.flatMap((owner, index) => (empty(each[index]) ? [] : [[owner, each[index]] as const]))),
    people,
    locale: normalizeLocale(settings.locale),
    timeZone: text(settings.timezone) || 'UTC',
  }
}
