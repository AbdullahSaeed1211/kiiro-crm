import { describe, expect, it } from 'vitest'
import {
  applyMove,
  confirmMove,
  dropStageId,
  groupCards,
  initialCollapsed,
  planMove,
  readCardData,
  rollbackMove,
  settleMove,
  toggleCollapsed,
  withName,
} from '../../../src/composites/KanbanBoard/board-state'
import type { KanbanCard, KanbanStage } from '../../../src/composites/KanbanBoard/types'

const stages: KanbanStage[] = [
  { id: 'todo', name: 'To do', category: 'open', color: 'blue' },
  { id: 'doing', name: 'Doing', category: 'active', color: 'amber' },
  { id: 'done', name: 'Done', category: 'done_success', color: 'green' },
  { id: 'lost', name: 'Lost', category: 'done_failure', color: 'red' },
  { id: 'dropped', name: 'Dropped', category: 'cancelled', color: 'gray' },
]

const cards: KanbanCard[] = [
  { id: 'c1', stageId: 'todo', title: 'Write brief', updatedAt: 10 },
  { id: 'c2', stageId: 'todo', title: 'Approve budget', updatedAt: 20 },
  { id: 'c3', stageId: 'doing', title: 'Call supplier', updatedAt: 30 },
  { id: 'c4', stageId: 'archived', title: 'Orphan', updatedAt: 40 },
]

const titles = (group: readonly KanbanCard[] | undefined) => (group ?? []).map((card) => card.title)

describe('columns', () => {
  it('collapses exactly the terminal stages', () => {
    expect([...initialCollapsed(stages)]).toEqual(['done', 'lost', 'dropped'])
  })

  it('toggles a column without mutating the previous set', () => {
    const collapsed = initialCollapsed(stages)
    const expanded = toggleCollapsed(collapsed, 'done')
    expect(expanded.has('done')).toBe(false)
    expect(collapsed.has('done')).toBe(true)
    expect(toggleCollapsed(expanded, 'done').has('done')).toBe(true)
  })

  it('groups cards per stage sorted by title and drops unknown stages', () => {
    const groups = groupCards(stages, cards)
    expect(titles(groups.get('todo'))).toEqual(['Approve budget', 'Write brief'])
    expect(titles(groups.get('done'))).toEqual([])
    expect([...groups.values()].flat()).toHaveLength(3)
  })
})

describe('moves', () => {
  it('plans a move with the card version and skips same-stage or missing cards', () => {
    expect(planMove(cards, 'c1', 'doing')).toEqual({ cardId: 'c1', toStageId: 'doing', expectedUpdatedAt: 10 })
    expect(planMove(cards, 'c1', 'todo')).toBeUndefined()
    expect(planMove(cards, 'missing', 'doing')).toBeUndefined()
  })

  it('applies a move optimistically and confirms the saved version', () => {
    const moved = applyMove(cards, { cardId: 'c1', toStageId: 'doing', expectedUpdatedAt: 10 })
    expect(titles(groupCards(stages, moved).get('doing'))).toEqual(['Call supplier', 'Write brief'])
    expect(moved[0]?.updatedAt).toBe(10)
    expect(confirmMove(moved, 'c1', { stageId: 'doing', updatedAt: 11 })[0]).toMatchObject({
      stageId: 'doing',
      updatedAt: 11,
    })
    expect(cards[0]?.stageId).toBe('todo')
  })

  it('turns a thrown onMove error into a failed result', async () => {
    const saved = { ok: true, data: { stageId: 'doing', updatedAt: 11 } } as const
    await expect(settleMove(() => Promise.resolve(saved))).resolves.toBe(saved)
    await expect(settleMove(() => Promise.reject(new Error('offline')))).resolves.toEqual({
      ok: false,
      error: { code: 'INTERNAL', message: 'offline' },
    })
    await expect(
      settleMove(() => {
        throw new Error('sync')
      }),
    ).resolves.toMatchObject({ ok: false })
  })

  it('rolls back only the failed card', () => {
    const previous = cards[0]
    if (previous === undefined) throw new Error('fixture')
    const first = applyMove(cards, { cardId: 'c1', toStageId: 'done', expectedUpdatedAt: 10 })
    const both = applyMove(first, { cardId: 'c3', toStageId: 'done', expectedUpdatedAt: 30 })
    const rolledBack = rollbackMove(both, previous)
    expect(rolledBack.map((card) => card.stageId)).toEqual(['todo', 'todo', 'done', 'archived'])
  })
})

describe('drag data', () => {
  it('reads card data and ignores other payloads', () => {
    expect(readCardData({ cardId: 'c1', stageId: 'todo' })).toEqual({ cardId: 'c1', stageId: 'todo' })
    expect(readCardData({ cardId: 1, stageId: 'todo' })).toBeUndefined()
  })

  it('takes the stage of the innermost target that has one', () => {
    const edge = Symbol('edge')
    expect(dropStageId([{ data: { [edge]: 'top' } }, { data: { stageId: 'doing' } }, { data: { stageId: 'x' } }])).toBe(
      'doing',
    )
    expect(dropStageId([])).toBeUndefined()
  })

  it('fills stage names into label templates', () => {
    expect(withName('Expand {name}', 'Done')).toBe('Expand Done')
  })
})
