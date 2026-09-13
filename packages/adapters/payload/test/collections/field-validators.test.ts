import { describe, expect, it } from 'vitest'
import { isStringList } from '../../src/collections/fields'
import { isOptionalHexColor, isTimeZone } from '../../src/collections/settings'

describe('field validators', () => {
  it('accepts only lists of strings for recipient fields', () => {
    expect(isStringList(['a@example.com', 'b@example.com'])).toBe(true)
    expect(isStringList([])).toBe(true)
    expect(isStringList(['a@example.com', 3])).toBe(false)
    expect(isStringList('a@example.com')).toBe(false)
  })

  it('accepts IANA time zones only', () => {
    expect(isTimeZone('America/New_York')).toBe(true)
    expect(isTimeZone('UTC')).toBe(true)
    expect(isTimeZone('Mars/Olympus')).toBe(false)
    expect(isTimeZone('')).toBe(false)
  })

  it('accepts an empty brand color or a six-digit hex color', () => {
    expect(isOptionalHexColor('#1F6feb')).toBe(true)
    expect(isOptionalHexColor(undefined)).toBe(true)
    expect(isOptionalHexColor('')).toBe(true)
    expect(isOptionalHexColor('#fff')).toBe(false)
    expect(isOptionalHexColor('blue')).toBe(false)
  })
})
