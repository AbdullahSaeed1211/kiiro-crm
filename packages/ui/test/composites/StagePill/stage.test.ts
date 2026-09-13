import { describe, expect, it } from 'vitest'
import { groupStages, orderStages, stageDotClass, stagePillClass } from '../../../src/composites/StagePill/stage'
import type { StageOption } from '../../../src/composites/StagePill/stage'

const stages: StageOption[] = [
  { id: 'won', name: 'Won', category: 'done_success', color: 'green' },
  { id: 'new', name: 'New', category: 'open', color: 'blue' },
  { id: 'lost', name: 'Lost', category: 'done_failure', color: 'red' },
]

describe('stage helpers', () => {
  it('keeps open stages before terminal stages without mutating input', () => {
    expect(orderStages(stages).map((stage) => stage.id)).toEqual(['new', 'won', 'lost'])
    expect(stages.map((stage) => stage.id)).toEqual(['won', 'new', 'lost'])
    expect(groupStages(stages).terminal.map((stage) => stage.id)).toEqual(['won', 'lost'])
  })

  it('maps colors to the shared token classes', () => {
    expect(stageDotClass('blue')).toBe('bg-stage-blue')
    expect(stagePillClass('blue')).toBe('bg-stage-blue/15')
  })
})
