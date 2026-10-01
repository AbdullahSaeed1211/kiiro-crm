import type { Where } from 'payload'
import type { Locale } from '../../../i18n/config'
import { getWorkspaceSettings } from '../../auth/context'
import { normalizeLocale } from '../../../i18n/config'
import type { RequestContext } from '../../container'

/** How many tasks the timeline draws; more than this is unreadable as a chart. */
const TIMELINE_LIMIT = 300
const FINISHED = new Set(['done_success', 'done_failure', 'cancelled'])
const COLORS = new Set(['gray', 'blue', 'green', 'amber', 'red', 'violet', 'teal', 'pink'])

interface TimelineRow {
  readonly id: string
  readonly title: string
  readonly startAt: number | null
  readonly dueAt: number | null
  readonly updatedAt: number
  readonly tone: 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'teal' | 'pink'
}

export interface TimelineData {
  readonly rows: readonly TimelineRow[]
  /** Open tasks with a date, of which `rows` shows the soonest. */
  readonly total: number
  readonly locale: Locale
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '')

/** Stage colours by id, and the ids of finished stages, from the task workflow. */
async function taskStages(context: RequestContext) {
  const found = await context.payload.find({
    collection: 'workflows',
    where: { recordType: { equals: 'task' } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    req: context.req,
  })
  const tones = new Map<string, TimelineRow['tone']>()
  const finished: string[] = []
  for (const row of Array.isArray(found.docs[0]?.stages) ? found.docs[0].stages : []) {
    const stage = row as { id?: unknown; category?: unknown; color?: unknown }
    if (typeof stage.id !== 'string') continue
    tones.set(stage.id, COLORS.has(text(stage.color)) ? (text(stage.color) as TimelineRow['tone']) : 'gray')
    if (FINISHED.has(text(stage.category))) finished.push(stage.id)
  }
  return { tones, finished }
}

/** The soonest open tasks that have a start or due date, read as one small page and not the whole task list. */
export async function loadTimelineTasks(context: RequestContext): Promise<TimelineData> {
  const [{ tones, finished }, settings] = await Promise.all([taskStages(context), getWorkspaceSettings()])
  const dated: Where = { or: [{ startAt: { exists: true } }, { dueAt: { exists: true } }] }
  const where: Where = finished.length === 0 ? dated : { and: [dated, { stageId: { not_in: finished } }] }
  const page = await context.payload.find({
    collection: 'tasks',
    where,
    sort: 'dueAt',
    limit: TIMELINE_LIMIT,
    page: 1,
    select: { id: true, title: true, startAt: true, dueAt: true, stageId: true, updatedAt: true, rank: true },
    depth: 0,
    overrideAccess: false,
    req: context.req,
  })
  return {
    // Listed in the order tasks are ranked everywhere else, so rescheduling a bar does not make its row jump.
    rows: page.docs
      .toSorted((a, b) => text(a.rank).localeCompare(text(b.rank)) || a.id.localeCompare(b.id))
      .map((task) => ({
        id: task.id,
        title: task.title,
        startAt: task.startAt ?? null,
        dueAt: task.dueAt ?? null,
        updatedAt: Date.parse(task.updatedAt),
        tone: tones.get(text(task.stageId)) ?? 'gray',
      })),
    total: page.totalDocs,
    locale: normalizeLocale(settings.locale),
  }
}
