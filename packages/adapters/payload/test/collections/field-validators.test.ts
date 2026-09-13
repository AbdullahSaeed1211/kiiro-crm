import { describe, expect, it } from 'vitest'
import { isCurrencyCode, isOptionalMinorUnits, isStringList } from '../../src/collections/fields'
import { isOptionalHexColor, isTimeZone } from '../../src/collections/settings'

describe('field validators', () => {
  it('accepts only three-letter uppercase currency codes', () => {
    expect(isCurrencyCode('USD')).toBe(true)
    expect(isCurrencyCode('usd')).toBe(false)
    expect(isCurrencyCode('US')).toBe(false)
    expect(isCurrencyCode('USDX')).toBe(false)
    expect(isCurrencyCode(840)).toBe(false)
  })

  it('accepts an empty amount or whole minor units of zero or more', () => {
    expect(isOptionalMinorUnits(0)).toBe(true)
    expect(isOptionalMinorUnits(125_000)).toBe(true)
    expect(isOptionalMinorUnits(null)).toBe(true)
    expect(isOptionalMinorUnits(undefined)).toBe(true)
    expect(isOptionalMinorUnits(-1)).toBe(false)
    expect(isOptionalMinorUnits(10.5)).toBe(false)
    expect(isOptionalMinorUnits('100')).toBe(false)
  })

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
