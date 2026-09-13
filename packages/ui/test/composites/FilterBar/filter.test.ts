import { describe, expect, it } from 'vitest'
import { hasActiveFilters, normalizeStages, toggleStage } from '../../../src/composites/FilterBar/filter'

describe('filter helpers', () => {
  it('toggles stages and preserves selected order', () => {
    expect(toggleStage(['new', 'active'], 'active')).toEqual(['new'])
    expect(toggleStage(['new'], 'won')).toEqual(['new', 'won'])
  })

  it('normalizes URL stage values', () => {
    expect(normalizeStages(['', 'new', 'new', 'active'])).toEqual(['new', 'active'])
    expect(hasActiveFilters('  ', [])).toBe(false)
    expect(hasActiveFilters('', ['new'])).toBe(true)
  })
})
