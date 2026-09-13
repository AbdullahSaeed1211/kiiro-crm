import type { TaskListItem, TaskPriority } from './types'

const DAY_MS = 86_400_000
// A fixed reference day keeps the fixture output identical on every render.
const REFERENCE_DAY = Date.UTC(2026, 8, 14)

const STAGES = {
  backlog: { name: 'Backlog', color: 'gray', position: 0 },
  todo: { name: 'To do', color: 'blue', position: 1 },
  doing: { name: 'In progress', color: 'amber', position: 2 },
  review: { name: 'In review', color: 'violet', position: 3 },
  done: { name: 'Done', color: 'green', position: 4 },
} as const satisfies Record<string, TaskListItem['stage']>

const PEOPLE = {
  avery: { id: 'user-avery', name: 'Avery Example', email: 'avery@example.test' },
  blake: { id: 'user-blake', name: 'Blake Sample', email: 'blake@example.test' },
  casey: { id: 'user-casey', name: 'Casey Demo', email: 'casey@example.test' },
  drew: { id: 'user-drew', name: 'Drew Tester', email: 'drew@example.test' },
} as const

const CONTEXTS = { web: 'Website refresh', review: 'Quarterly review', office: 'Office move' } as const

type FixtureRow = readonly [
  title: string,
  stage: keyof typeof STAGES,
  priority: TaskPriority,
  assignees: readonly (keyof typeof PEOPLE)[],
  dueInDays: number | null,
  context: keyof typeof CONTEXTS | null,
]

const ROWS: readonly FixtureRow[] = [
  ['Draft onboarding checklist', 'doing', 'high', ['avery'], 2, 'web'],
  ['Review homepage copy', 'review', 'medium', ['blake', 'casey'], 1, 'web'],
  ['Collect quarterly figures', 'todo', 'urgent', ['casey'], -1, 'review'],
  ['Book a venue for the team day', 'backlog', 'low', [], null, null],
  ['Update color tokens', 'done', 'medium', ['avery'], -5, 'web'],
  ['Prepare invoice batch', 'todo', 'high', ['blake'], 4, 'review'],
  ['Fix contact form validation', 'doing', 'urgent', ['avery', 'blake', 'casey', 'drew'], 0, 'web'],
  ['Archive old project files', 'backlog', 'none', ['drew'], null, 'office'],
  ['Order new desk chairs', 'todo', 'low', ['drew'], 10, 'office'],
  ['Schedule supplier walkthrough', 'review', 'medium', ['casey'], 6, 'office'],
  ['Write release notes', 'done', 'low', ['blake'], -2, 'web'],
  ['Set budget for next quarter', 'doing', 'high', ['avery', 'drew'], 8, 'review'],
]

/** Spike fixture rows for the tasks list; M1-L3 replaces them with Payload data. */
export const TASK_FIXTURES: readonly TaskListItem[] = ROWS.map(
  ([title, stage, priority, assignees, dueInDays, context], index) => ({
    id: `task-${String(index + 1).padStart(2, '0')}`,
    title,
    stage: STAGES[stage],
    priority,
    assignees: assignees.map((key) => PEOPLE[key]),
    dueAt: dueInDays === null ? null : REFERENCE_DAY + dueInDays * DAY_MS,
    context: context === null ? null : { label: CONTEXTS[context] },
  }),
)
