const DAY_MS = 86_400_000

/** Where a lead's next action sits relative to today, most urgent first. */
export const FOLLOW_UP_BUCKETS = ['overdue', 'today', 'thisWeek', 'later', 'undated'] as const
export type FollowUpBucket = (typeof FOLLOW_UP_BUCKETS)[number]

/** Start of the UTC day that contains `time`; follow-up days are stored as UTC midnight. */
function startOfDay(time: number): number {
  return Math.floor(time / DAY_MS) * DAY_MS
}

/**
 * The bucket for a follow-up day: before today is overdue, today's day is today, the next six days are this week,
 * anything after that is later, and a lead with no date is undated.
 */
export function followUpBucket(nextActionAt: number | null, now: number): FollowUpBucket {
  if (nextActionAt === null) return 'undated'
  const today = startOfDay(now)
  const day = startOfDay(nextActionAt)
  if (day < today) return 'overdue'
  if (day === today) return 'today'
  return day < today + 7 * DAY_MS ? 'thisWeek' : 'later'
}

/** Groups items into every bucket (empty ones included), each sorted by date and then by `tiebreak`. */
export function groupFollowUps<T>(
  items: readonly T[],
  read: { readonly day: (item: T) => number | null; readonly tiebreak: (item: T) => string; readonly now: number },
): Readonly<Record<FollowUpBucket, readonly T[]>> {
  const groups: Record<FollowUpBucket, T[]> = { overdue: [], today: [], thisWeek: [], later: [], undated: [] }
  for (const item of items) groups[followUpBucket(read.day(item), read.now)].push(item)
  for (const bucket of FOLLOW_UP_BUCKETS) {
    groups[bucket].sort(
      (a, b) => (read.day(a) ?? 0) - (read.day(b) ?? 0) || read.tiebreak(a).localeCompare(read.tiebreak(b)),
    )
  }
  return groups
}
