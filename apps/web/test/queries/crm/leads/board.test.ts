import { describe, expect, it } from 'vitest'
import { deferredLostMoveResult } from '../../../../src/app/(app)/leads/lead-board-model'

describe('lead board move model', () => {
  it('defers lost drops without reporting a move failure or changing the source state', () => {
    expect(deferredLostMoveResult('qualified', 7)).toEqual({
      ok: true,
      data: { stageId: 'qualified', updatedAt: 7 },
    })
  })
})
