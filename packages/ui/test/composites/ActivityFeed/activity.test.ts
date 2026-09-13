import { describe, expect, it } from 'vitest'
import { activityPage, newestFirst, type ActivityEntry } from '../../../src/composites/ActivityFeed/activity'

const entries: ActivityEntry[] = [
  { id: 'old', occurredAt: 10, summary: 'old' },
  { id: 'new', occurredAt: 20, summary: 'new' },
  { id: 'same-a', occurredAt: 20, summary: 'same' },
]

describe('activity helpers', () => {
  it('sorts newest first and leaves the input untouched', () => {
    expect(newestFirst(entries).map((entry) => entry.id)).toEqual(['new', 'same-a', 'old'])
    expect(entries[0]?.id).toBe('old')
  })

  it('returns a bounded page and more flag', () => {
    expect(activityPage(entries, 2)).toEqual({ entries: [entries[1], entries[2]], hasMore: true })
    expect(activityPage(entries, 0).entries).toHaveLength(1)
  })
})
