import { describe, expect, it } from 'vitest'
import { displayName, parseDirectoryPage, parseDirectorySort } from '../../../src/server/crm/directory/utils'

describe('directory utilities', () => {
  it('normalizes names without leaving a trailing space', () => {
    expect(displayName({ firstName: 'Ada', lastName: null })).toBe('Ada')
    expect(displayName({ firstName: 'Ada', lastName: 'Lovelace' })).toBe('Ada Lovelace')
  })

  it('rejects invalid pagination and sort inputs', () => {
    expect(parseDirectoryPage('-2')).toBe(1)
    expect(parseDirectoryPage('3')).toBe(3)
    expect(parseDirectorySort('-updatedAt')).toBe('-updatedAt')
    expect(parseDirectorySort('unknown')).toBe('name')
  })
})
