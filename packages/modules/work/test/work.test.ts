import { asId } from '@ops/kernel'
import { describe, expect, it } from 'vitest'
import { hasOpenChildren, myTasksBuckets, orderByRank, rankBetween, rebalanceRanks, subtaskDepth } from '../src'
import type { WorkTaskRecord } from '../src'

const task = (id: string, extra: Partial<WorkTaskRecord> = {}): WorkTaskRecord => ({
  id: asId(id),
  title: id,
  description: null,
  projectId: null,
  relatedType: null,
  relatedId: null,
  parentTaskId: null,
  workflowId: asId('workflow'),
  stageId: asId('open'),
  stageEnteredAt: 0,
  rank: id,
  priority: 'none',
  assigneeIds: [asId('staff')],
  groupId: null,
  startAt: null,
  dueAt: null,
  completedAt: null,
  createdAt: 0,
  updatedAt: 1,
  ...extra,
})

describe('work calendar and hierarchy invariants', () => {
  it('T-WORK-1 buckets by tenant calendar day across a DST boundary', () => {
    const now = Date.parse('2026-11-01T05:30:00.000Z')
    const result = myTasksBuckets({
      tasks: [
        task('today', { dueAt: now + 30 * 60_000 }),
        task('next', { dueAt: Date.parse('2026-11-02T05:00:00.000Z') }),
      ],
      actor: { id: asId('staff') },
      timeZone: 'America/New_York',
      now,
    })
    expect(result.today.map((value) => value.id)).toEqual(['today'])
    expect(result.next7Days.map((value) => value.id)).toEqual(['next'])
  })

  it('T-WORK-2 reports two levels of ancestry and rejects open children for a terminal parent', () => {
    const root = task('root')
    const child = task('child', { parentTaskId: root.id })
    const grandchild = task('grandchild', { parentTaskId: child.id })
    const records = new Map([
      [root.id, root],
      [child.id, child],
      [grandchild.id, grandchild],
    ])
    expect(subtaskDepth(grandchild, records)).toBe(2)
    expect(hasOpenChildren([child])).toBe(true)
    expect(hasOpenChildren([task('done-child', { completedAt: 1 })])).toBe(false)
  })
})

describe('work ordering and assignment invariants', () => {
  it('T-WORK-3 keeps rank moves deterministic and supports rebalancing', () => {
    expect(rankBetween('a', 'c')).toBe('b')
    expect(orderByRank([task('b', { rank: '2' }), task('a', { rank: '1' })]).map((value) => value.id)).toEqual([
      'a',
      'b',
    ])
    expect([...rebalanceRanks(['a', 'b']).values()]).toEqual(['000000000001', '000000000002'])
  })

  it('T-WORK-4 excludes completed tasks and tasks assigned to another staff member', () => {
    const now = Date.parse('2026-09-14T12:00:00.000Z')
    const result = myTasksBuckets({
      tasks: [
        task('open', { dueAt: now }),
        task('closed', { dueAt: now, completedAt: now }),
        task('other', { dueAt: now, assigneeIds: [asId('other')] }),
      ],
      actor: { id: asId('staff') },
      timeZone: 'UTC',
      now,
    })
    expect(result.today.map((value) => value.id)).toEqual(['open'])
  })
})
