import type { WorkListTask } from '../queries/work/read-models'

/** The kinds of agency work a client's tasks are grouped under, in the order the dashboard lists them. */
const AREAS = [
  'seo',
  'gbp',
  'socialMedia',
  'instagram',
  'facebook',
  'youtube',
  'pinterest',
  'tiktok',
  'blog',
  'reports',
  'collections',
  'other',
] as const

type Area = (typeof AREAS)[number]

/** Title starts that put a task in an area. The first match wins, so "Social media" comes before the channels. */
const PREFIXES: readonly (readonly [prefix: string, area: Area])[] = [
  ['seo', 'seo'],
  ['gbp', 'gbp'],
  ['social media', 'socialMedia'],
  ['instagram', 'instagram'],
  ['facebook', 'facebook'],
  ['youtube', 'youtube'],
  ['pinterest', 'pinterest'],
  ['tiktok', 'tiktok'],
  ['blog', 'blog'],
  ['monthly client report', 'reports'],
  ['collections', 'collections'],
]

interface AreaRow {
  readonly area: Area
  readonly open: number
  readonly overdue: number
  /** The soonest due time among open tasks, or null. */
  readonly nextDueAt: number | null
}

export interface ClientDashboard {
  readonly open: number
  readonly overdue: number
  readonly dueSoon: number
  readonly done: number
  readonly areas: readonly AreaRow[]
}

const WEEK_MS = 7 * 86_400_000

const isFinished = (task: WorkListTask): boolean =>
  task.stageCategory === 'done_success' || task.stageCategory === 'done_failure' || task.stageCategory === 'cancelled'

/** The area a task belongs to, from its title. */
function areaOf(title: string): Area {
  const lower = title.trim().toLowerCase()
  return PREFIXES.find(([prefix]) => lower.startsWith(prefix))?.[1] ?? 'other'
}

function rowFor(area: Area, tasks: readonly WorkListTask[], now: number): AreaRow {
  const open = tasks.filter((task) => !isFinished(task))
  const due = open.flatMap((task) => (task.dueAt === null ? [] : [task.dueAt]))
  return {
    area,
    open: open.length,
    overdue: open.filter((task) => task.dueAt !== null && task.dueAt < now).length,
    nextDueAt: due.length === 0 ? null : Math.min(...due),
  }
}

/** What is open, late and done for one client's tasks, and the same per area of work. */
export function buildClientDashboard(tasks: readonly WorkListTask[], now: number): ClientDashboard {
  const open = tasks.filter((task) => !isFinished(task))
  return {
    open: open.length,
    overdue: open.filter((task) => task.dueAt !== null && task.dueAt < now).length,
    dueSoon: open.filter((task) => task.dueAt !== null && task.dueAt >= now && task.dueAt < now + WEEK_MS).length,
    done: tasks.length - open.length,
    areas: AREAS.map((area) =>
      rowFor(
        area,
        tasks.filter((task) => areaOf(task.title) === area),
        now,
      ),
    ).filter((row) => row.open > 0),
  }
}
