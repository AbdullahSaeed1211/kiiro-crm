/** How often a task repeats once it is completed (spec §10.2). */
export const TASK_REPEATS = ['none', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'] as const
export type TaskRepeat = (typeof TASK_REPEATS)[number]

const DAY_MS = 86_400_000
const MONTHS: Readonly<Partial<Record<TaskRepeat, number>>> = { monthly: 1, quarterly: 3, yearly: 12 }
const DAYS: Readonly<Partial<Record<TaskRepeat, number>>> = { daily: 1, weekly: 7, biweekly: 14 }

/** Adds whole months in UTC; a day that the target month lacks (the 31st) lands on that month's last day. */
function addMonths(time: number, months: number): number {
  const date = new Date(time)
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  const day = Math.min(date.getUTCDate(), lastDay)
  return Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), day) + (time % DAY_MS)
}

/** The most periods counted, so a very old due date cannot loop for long. */
const MAX_PERIODS = 366

/**
 * How many periods of a repeating task have gone by unfinished: the task's own due date counts as one, and each
 * later step that is also in the past counts again. Zero when the task is not overdue or does not repeat.
 */
export function missedPeriods(dueAt: number, repeat: TaskRepeat, now: number): number {
  if (repeat === 'none' || dueAt > now) return 0
  let count = 1
  let next = nextOccurrence(dueAt, repeat)
  while (next <= now && count < MAX_PERIODS) {
    count += 1
    next = nextOccurrence(next, repeat)
  }
  return count
}

/** The next occurrence after `time` (epoch ms), counted from that time and not from when the task was completed. */
export function nextOccurrence(time: number, repeat: TaskRepeat): number {
  const months = MONTHS[repeat]
  if (months !== undefined) return addMonths(time, months)
  return time + (DAYS[repeat] ?? 0) * DAY_MS
}

/** The next scheduled calendar day strictly after today, even while older occurrences remain unfinished. */
export function nextRunAfter(dueAt: number, repeat: TaskRepeat, today: number): number | null {
  if (repeat === 'none') return null
  if (dueAt > today) return dueAt
  const days = DAYS[repeat]
  if (days !== undefined) {
    const step = days * DAY_MS
    return dueAt + (Math.floor((today - dueAt) / step) + 1) * step
  }
  let next = nextOccurrence(dueAt, repeat)
  while (next <= today) next = nextOccurrence(next, repeat)
  return next
}
