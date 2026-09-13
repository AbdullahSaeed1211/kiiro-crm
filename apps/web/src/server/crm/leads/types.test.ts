import { describe, expect, it } from 'vitest'
import { displayName, initials, stageFor } from './types'

describe('lead view helpers', () => {
  it('builds readable initials from a person name', () => {
    expect(initials('Jane Doe')).toBe('JD')
    expect(initials('  single  ')).toBe('S')
  })

  it('falls back to an available lead identity', () => {
    expect(displayName({ title: 'A title' } as never)).toBe('A title')
    expect(displayName({ title: '', firstName: 'Jane', lastName: 'Doe' } as never)).toBe('Jane Doe')
  })

  it('returns a safe stage when a record references an unknown stage', () => {
    expect(stageFor([], 'missing')).toMatchObject({ id: 'missing', name: 'Unknown stage', color: 'gray' })
  })
})
