import { describe, expect, it } from 'vitest'
import { peopleCollections } from '../../src/collections/people/collections'
import {
  configCollections,
  isHexColor,
  isIanaTimeZone,
  settingsGlobalConfig,
} from '../../src/collections/config/collections'

describe('people and configuration collections', () => {
  it('declares the people vertical collections with durable timestamps', () => {
    expect(peopleCollections.map((collection) => collection.slug)).toEqual([
      'users',
      'groups',
      'invitations',
      'notificationPrefs',
    ])
    expect(
      peopleCollections.every((collection) => collection.timestamps === true && collection.versions === false),
    ).toBe(true)
  })

  it('declares the configuration vertical and settings fields', () => {
    expect(configCollections.map((collection) => collection.slug)).toEqual([
      'fieldDefinitions',
      'workflows',
      'savedViews',
      'layouts',
    ])
    expect(settingsGlobalConfig.fields.map((field) => ('name' in field ? field.name : ''))).toEqual(
      expect.arrayContaining(['appName', 'brand', 'modules', 'terminology', 'onboardedAt']),
    )
  })

  it('validates branding and timezone inputs', () => {
    expect(isHexColor('#abcdef')).toBe(true)
    expect(isHexColor('#abc')).toBe(false)
    expect(isIanaTimeZone('Europe/London')).toBe(true)
    expect(isIanaTimeZone('not/a-zone')).toBe(false)
  })
})
