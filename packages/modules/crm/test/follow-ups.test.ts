import { describe, expect, it } from 'vitest'
import { followUpBucket, groupFollowUps } from '../src/domain/follow-ups'

const DAY = 86_400_000
// 2026-10-01 at 15:30 UTC; follow-up days are stored as UTC midnight.
const NOW = Date.UTC(2026, 9, 1, 15, 30)
const TODAY = Date.UTC(2026, 9, 1)

describe('followUpBucket', () => {
  it('puts yesterday in overdue and today in today even late in the day', () => {
    expect(followUpBucket(TODAY - DAY, NOW)).toBe('overdue')
    expect(followUpBucket(TODAY, NOW)).toBe('today')
  })

  it('splits this week from later at seven days out', () => {
    expect(followUpBucket(TODAY + 6 * DAY, NOW)).toBe('thisWeek')
    expect(followUpBucket(TODAY + 7 * DAY, NOW)).toBe('later')
  })

  it('keeps a lead without a date apart', () => {
    expect(followUpBucket(null, NOW)).toBe('undated')
  })
})

describe('groupFollowUps', () => {
  it('sorts each bucket by date, then by title, and keeps empty buckets', () => {
    const items = [
      { title: 'B', day: TODAY + 2 * DAY },
      { title: 'A', day: TODAY + 2 * DAY },
      { title: 'C', day: TODAY + DAY },
    ]
    const groups = groupFollowUps(items, { day: (item) => item.day, tiebreak: (item) => item.title, now: NOW })
    expect(groups.thisWeek.map((item) => item.title)).toEqual(['C', 'A', 'B'])
    expect(groups.overdue).toEqual([])
  })
})
