/** Client-safe IANA timezone options for onboarding controls. */
const FALLBACK_TIMEZONE_VALUES = [
  'UTC',
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
  'Pacific/Auckland',
] as const

export const TIMEZONE_VALUES: readonly string[] = Object.freeze(
  typeof Intl.supportedValuesOf === 'function'
    ? [
        'UTC',
        ...[...new Set([...Intl.supportedValuesOf('timeZone'), 'Asia/Kolkata'])]
          .filter((value) => value !== 'UTC')
          .sort((left, right) => left.localeCompare(right)),
      ]
    : [...FALLBACK_TIMEZONE_VALUES],
)
