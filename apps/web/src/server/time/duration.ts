const MAX_MINUTES = 1440

/**
 * Whole minutes from what a person types: `90`, `90m`, `1.5`, `1.5h`, `1h 30m`, `1:30`. A bare number up to 24 is read as
 * hours (`2` is two hours) and a larger one as minutes (`45`). Null when it is not a duration or is not 1 minute to 24 hours.
 */
export function parseDuration(text: string): number | null {
  const value = text.trim().toLowerCase()
  const minutes = fromClock(value) ?? fromUnits(value) ?? fromBare(value)
  return minutes !== null && minutes >= 1 && minutes <= MAX_MINUTES ? Math.round(minutes) : null
}

function fromClock(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/u.exec(value)
  return match === null ? null : Number(match[1]) * 60 + Number(match[2])
}

const UNITS = /^(?:([\d.]+)h)?(?:(\d+)m)?$/u

/** Spaces dropped and unit words shortened, so `1 hour 30 mins` reads as `1h30m`. */
const shorten = (value: string): string =>
  value
    .replaceAll(/\s+/gu, '')
    .replaceAll(/hours?|hrs?/gu, 'h')
    .replaceAll(/minutes?|mins?/gu, 'm')

/** `1h 30m`, `90m`, `2 hours`: an hours part, a minutes part, or both, and nothing else. */
function fromUnits(value: string): number | null {
  const text = shorten(value)
  const match = UNITS.exec(text)
  if (match === null || text === '') return null
  const total = Number(match[1] || 0) * 60 + Number(match[2] || 0)
  return Number.isFinite(total) ? total : null
}

function fromBare(value: string): number | null {
  if (!/^\d+(?:\.\d+)?$/u.test(value)) return null
  const number = Number(value)
  return number <= 24 ? number * 60 : number
}

/** `1h 30m`, `45m` or `2h`. */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${String(rest)}m`
  return rest === 0 ? `${String(hours)}h` : `${String(hours)}h ${String(rest)}m`
}
