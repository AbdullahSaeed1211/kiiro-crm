import { payloadData } from '../auth/api'
import type { RequestContext } from '../container'

type ReportContext = Pick<RequestContext, 'payload' | 'req'>
import { loadPeople } from '../people'

/** D1 binds at most 100 variables per statement, so ids are looked up in chunks. */
const ID_CHUNK = 80

export interface TimeTotal {
  readonly id: string
  readonly name: string
  readonly minutes: number
}

export interface TimeReport {
  readonly total: number
  readonly byPerson: readonly TimeTotal[]
  readonly byProject: readonly TimeTotal[]
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '')
const refId = (value: unknown): string =>
  typeof value === 'object' && value !== null ? text((value as { id?: unknown }).id) : text(value)

async function inChunks(
  context: ReportContext,
  input: { collection: 'tasks' | 'projects'; ids: readonly string[]; field: string },
): Promise<Map<string, Record<string, unknown>>> {
  const found = new Map<string, Record<string, unknown>>()
  const unique = [...new Set(input.ids.filter((id) => id !== ''))]
  for (let at = 0; at < unique.length; at += ID_CHUNK) {
    const page = await payloadData(context.payload).find({
      collection: input.collection,
      where: { id: { in: unique.slice(at, at + ID_CHUNK) } },
      limit: ID_CHUNK,
      depth: 0,
      overrideAccess: true,
    })
    for (const doc of page.docs) if (doc !== undefined) found.set(String(doc.id), doc)
  }
  return found
}

const sorted = (totals: ReadonlyMap<string, TimeTotal>): TimeTotal[] =>
  [...totals].map(([, total]) => total).toSorted((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name))

export interface TimeRow {
  readonly day: number
  readonly personId: string
  readonly person: string
  readonly projectId: string
  readonly project: string
  readonly task: string
  readonly minutes: number
  readonly note: string
}

/** Every entry logged between two days (epoch ms, inclusive), oldest first, with names filled in. */
export async function loadTimeRows(
  context: ReportContext,
  range: { fromMs: number; toMs: number },
): Promise<TimeRow[]> {
  const entries = (
    await payloadData(context.payload).find({
      collection: 'timeEntries',
      where: { and: [{ day: { greater_than_equal: range.fromMs } }, { day: { less_than_equal: range.toMs } }] },
      sort: 'day',
      limit: 0,
      pagination: false,
      depth: 0,
      overrideAccess: true,
    })
  ).docs.flatMap((doc) => (doc === undefined ? [] : [doc]))
  const tasks = await inChunks(context, {
    collection: 'tasks',
    ids: entries.map((e) => refId(e.task)),
    field: 'project',
  })
  const projectOf = (entry: Record<string, unknown>): string => refId(tasks.get(refId(entry.task))?.project)
  const projects = await inChunks(context, { collection: 'projects', ids: entries.map(projectOf), field: 'name' })
  const people = await loadPeople(
    context,
    entries.map((entry) => refId(entry.user)),
  )
  return entries.map((entry) => ({
    day: typeof entry.day === 'number' ? entry.day : 0,
    personId: refId(entry.user),
    person: people.get(refId(entry.user))?.name ?? 'Someone',
    projectId: projectOf(entry),
    project: text(projects.get(projectOf(entry))?.name) || 'No project',
    task: text(tasks.get(refId(entry.task))?.title),
    minutes: typeof entry.minutes === 'number' ? entry.minutes : 0,
    note: text(entry.note),
  }))
}

/** Hours logged between two days, by person and by project; owners and managers only. */
export async function loadTimeReport(
  context: ReportContext,
  range: { fromMs: number; toMs: number },
): Promise<TimeReport> {
  const rows = await loadTimeRows(context, range)
  const byPerson = new Map<string, TimeTotal>()
  const byProject = new Map<string, TimeTotal>()
  for (const row of rows) {
    const person = byPerson.get(row.personId)
    byPerson.set(row.personId, { id: row.personId, name: row.person, minutes: (person?.minutes ?? 0) + row.minutes })
    const project = byProject.get(row.projectId)
    byProject.set(row.projectId, {
      id: row.projectId,
      name: row.project,
      minutes: (project?.minutes ?? 0) + row.minutes,
    })
  }
  return {
    total: rows.reduce((sum, row) => sum + row.minutes, 0),
    byPerson: sorted(byPerson),
    byProject: sorted(byProject),
  }
}
