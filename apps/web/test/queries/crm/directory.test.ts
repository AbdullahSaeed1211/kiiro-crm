import { describe, expect, it } from 'vitest'
import { activityReadOptions } from '../../../src/server/crm/directory/helpers'
import {
  displayName,
  hasRelationItems,
  parseDirectoryPage,
  parseDirectorySort,
  safeExternalHref,
  withActorOwner,
} from '../../../src/server/crm/directory/utils'

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

  it('keeps directory links and relation empties safe', () => {
    expect(hasRelationItems([])).toBe(false)
    expect(hasRelationItems(['row'])).toBe(true)
    expect(safeExternalHref('https://example.com')).toBe('https://example.com')
    expect(safeExternalHref('javascript:alert(1)')).toBeNull()
  })

  it('forces creates to use the authenticated actor as owner', () => {
    expect(withActorOwner({ name: 'Northstar', ownerId: 'attacker' }, 'actor')).toEqual({
      name: 'Northstar',
      ownerId: 'actor',
    })
    expect(withActorOwner(null, 'actor')).toBeNull()
  })

  it('only elevates activity reads after parent authorization', () => {
    expect(activityReadOptions(true)).toEqual({ overrideAccess: true })
    expect(activityReadOptions(false)).toEqual({ overrideAccess: false })
  })
})
