import { describe, expect, it } from 'vitest'
import { displayName, isTerminalStage, leadStageMoveError, stageFor } from '../../../../src/server/crm/leads/types'
import { initials } from '@ops/ui/lib/initials'

describe('lead view helpers', () => {
  it('builds readable initials from a person name', () => {
    expect(initials('Jane Doe')).toBe('JD')
    expect(initials('  single  ')).toBe('S')
    expect(initials('Design & Development')).toBe('DD')
  })

  it('falls back to an available lead identity', () => {
    expect(displayName({ title: 'A title' } as never)).toBe('A title')
    expect(displayName({ title: '', firstName: 'Jane', lastName: 'Doe' } as never)).toBe('Jane Doe')
  })

  it('identifies terminal stages and safely handles unknown stages', () => {
    expect(isTerminalStage({ category: 'done_success' })).toBe(true)
    expect(isTerminalStage({ category: 'open' })).toBe(false)
    expect(leadStageMoveError({ category: 'done_success' })).toContain('Convert')
    expect(leadStageMoveError({ category: 'done_failure' })).toContain('lost reason')
    expect(leadStageMoveError({ category: 'open' })).toBeNull()
    expect(stageFor([], 'missing')).toMatchObject({ id: 'missing', name: 'Unknown stage', color: 'gray' })
  })
})
