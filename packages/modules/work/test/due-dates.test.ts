import { expect, it } from 'vitest'
import { sameCalendarDayIn } from '../src'

it('matches an early-morning Kolkata checkout to the workspace day before UTC midnight', () => {
  expect(
    sameCalendarDayIn({
      first: Date.parse('2026-10-31T22:00:00.000Z'),
      second: Date.parse('2026-11-01T00:30:00.000Z'),
      timeZone: 'Asia/Kolkata',
    }),
  ).toBe(true)
})

it('matches a late-evening New York checkout after the DST fallback by local date', () => {
  expect(
    sameCalendarDayIn({
      first: Date.parse('2026-11-02T04:30:00.000Z'),
      second: Date.parse('2026-11-02T04:45:00.000Z'),
      timeZone: 'America/New_York',
    }),
  ).toBe(true)
})

it('keeps the repeated New York hour on the same calendar day across DST fallback', () => {
  expect(
    sameCalendarDayIn({
      first: Date.parse('2026-11-01T04:30:00.000Z'),
      second: Date.parse('2026-11-01T06:30:00.000Z'),
      timeZone: 'America/New_York',
    }),
  ).toBe(true)
})

it('does not include a checkout from the previous workspace day', () => {
  expect(
    sameCalendarDayIn({
      first: Date.parse('2026-11-02T04:59:59.999Z'),
      second: Date.parse('2026-11-02T05:00:00.000Z'),
      timeZone: 'America/New_York',
    }),
  ).toBe(false)
})
