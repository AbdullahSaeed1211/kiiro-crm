import { describe, expect, it } from 'vitest'
import {
  barSpan,
  barsSignature,
  committedDates,
  isDateCommit,
  rollbackUpdate,
  scaleSetup,
  spanMap,
  todayClass,
  toEpochDay,
  toLibraryDate,
  toLibraryTasks,
} from '../../../src/composites/GanttView/model'

const DAY = 24 * 60 * 60 * 1000
const SEP_14 = Date.UTC(2026, 8, 14)
const SEP_16 = Date.UTC(2026, 8, 16)

describe('barSpan', () => {
  it('keeps a valid start and end', () => {
    expect(barSpan({ start: SEP_14, end: SEP_16 })).toEqual({ start: SEP_14, end: SEP_16 })
  })

  it('defaults the start to one day before the due date', () => {
    expect(barSpan({ start: null, end: SEP_16 })).toEqual({ start: SEP_16 - DAY, end: SEP_16 })
  })

  it('defaults the end to one day after the start and grows short spans to a day', () => {
    expect(barSpan({ start: SEP_14, end: null })).toEqual({ start: SEP_14, end: SEP_14 + DAY })
    expect(barSpan({ start: SEP_16, end: SEP_14 })).toEqual({ start: SEP_16, end: SEP_16 + DAY })
  })

  it('has no span without dates', () => {
    expect(barSpan({ start: null, end: null })).toBeUndefined()
  })
})

describe('date mapping', () => {
  it('maps epoch ms to a local midnight of the same UTC day and back', () => {
    const date = toLibraryDate(SEP_14 + 5 * 60 * 60 * 1000)
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 8, 14, 0])
    expect(toEpochDay(date)).toBe(SEP_14)
  })

  it('rounds library dates to the nearest whole day', () => {
    expect(toEpochDay(new Date(2026, 8, 14, 11, 59))).toBe(SEP_14)
    expect(toEpochDay(new Date(2026, 8, 15, 12))).toBe(SEP_16)
  })

  it('reads committed dates from a library task', () => {
    const task = { start: new Date(2026, 8, 14), end: new Date(2026, 8, 16) }
    expect(committedDates(task)).toEqual({ startAt: SEP_14, dueAt: SEP_16 })
    expect(committedDates({ start: task.start })).toBeUndefined()
  })
})

describe('library tasks', () => {
  const bars = [
    { id: 'a', title: 'Draft', start: null, end: SEP_16 },
    { id: 'b', title: 'Undated', start: null, end: null },
  ]

  it('skips undated bars and applies the default start', () => {
    const [task, ...rest] = toLibraryTasks(bars)
    expect(rest).toHaveLength(0)
    expect(task).toMatchObject({ id: 'a', text: 'Draft', type: 'task' })
    expect(committedDates(task ?? {})).toEqual({ startAt: SEP_16 - DAY, dueAt: SEP_16 })
  })

  it('keeps confirmed spans by id and a content signature', () => {
    expect([...spanMap(bars)]).toEqual([['a', { start: SEP_16 - DAY, end: SEP_16 }]])
    expect(barsSignature(bars)).toBe(barsSignature(bars.map((bar) => ({ ...bar }))))
    expect(barsSignature(bars)).not.toBe(
      barsSignature([{ ...bars[0], id: 'a', title: 'Draft', start: SEP_14, end: SEP_16 }]),
    )
  })

  it('builds a rollback to the confirmed span', () => {
    const update = rollbackUpdate('a', { start: SEP_14, end: SEP_16 })
    expect(update.id).toBe('a')
    expect(committedDates(update.task)).toEqual({ startAt: SEP_14, dueAt: SEP_16 })
  })
})

describe('events and scales', () => {
  it('treats only a finished move or resize as a commit', () => {
    expect(isDateCommit({ diff: 2 })).toBe(true)
    expect(isDateCommit({ diff: -1, inProgress: false })).toBe(true)
    expect(isDateCommit({ diff: 0 })).toBe(false)
    expect(isDateCommit({ diff: 2, inProgress: true })).toBe(false)
    expect(isDateCommit({})).toBe(false)
  })

  it('snaps week zoom to day cells and month zoom to week cells', () => {
    expect(scaleSetup('week', 'en').scales.map((scale) => scale.unit)).toEqual(['month', 'day'])
    expect(scaleSetup('month', 'en').scales.map((scale) => scale.unit)).toEqual(['month', 'week'])
  })

  it('marks only today in day cells', () => {
    const now = new Date(2026, 8, 14, 15)
    expect(todayClass(new Date(2026, 8, 14), 'day', now)).not.toBe('')
    expect(todayClass(new Date(2026, 8, 15), 'day', now)).toBe('')
    expect(todayClass(new Date(2026, 8, 14), 'hour', now)).toBe('')
  })
})
