import { payloadData } from '../auth/api'
import type { RequestContext } from '../container'

type ReportContext = Pick<RequestContext, 'payload' | 'req'>
import { loadPeople } from '../people'

const MAX_ENTRIES = 2000
/** D1 binds at most 100 variables per statement, so ids are looked up in chunks. */
const ID_CHUNK = 80

export interface TimeTotal {
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

const sorted = (totals: ReadonlyMap<string, number>, names: (key: string) => string): TimeTotal[] =>
  [...totals]
    .map(([key, minutes]) => ({ name: names(key), minutes }))
    .toSorted((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name))

/** Hours logged between two days (epoch ms, inclusive), by person and by the project of each task; owners and managers only. */
export async function loadTimeReport(
  context: ReportContext,
  range: { fromMs: number; toMs: number },
): Promise<TimeReport> {
  const entries = (
    await payloadData(context.payload).find({
      collection: 'timeEntries',
      where: { and: [{ day: { greater_than_equal: range.fromMs } }, { day: { less_than_equal: range.toMs } }] },
      limit: MAX_ENTRIES,
      depth: 0,
      overrideAccess: true,
    })
  ).docs.flatMap((doc) => (doc === undefined ? [] : [doc]))
  const minutesOf = (entry: Record<string, unknown>): number => (typeof entry.minutes === 'number' ? entry.minutes : 0)
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
  const byPerson = new Map<string, number>()
  const byProject = new Map<string, number>()
  for (const entry of entries) {
    const person = refId(entry.user)
    const project = projectOf(entry)
    byPerson.set(person, (byPerson.get(person) ?? 0) + minutesOf(entry))
    byProject.set(project, (byProject.get(project) ?? 0) + minutesOf(entry))
  }
  return {
    total: entries.reduce((sum, entry) => sum + minutesOf(entry), 0),
    byPerson: sorted(byPerson, (id) => people.get(id)?.name ?? 'Someone'),
    byProject: sorted(byProject, (id) => text(projects.get(id)?.name) || 'No project'),
  }
}
