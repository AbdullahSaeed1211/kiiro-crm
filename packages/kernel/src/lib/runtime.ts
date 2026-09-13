import type { Clock, Id, Logger, LogFields } from '../contracts/result'

const REDACTED_KEYS = new Set([
  'password',
  'token',
  'cookie',
  'authorization',
  'secret',
  'payload',
  'body',
  'html',
  'text',
])

/** Clock backed by the system time. */
export const systemClock: Clock = { now: () => Date.now() }

/** Clock that always returns `ms`; for tests. */
export function fixedClock(ms: number): Clock {
  return { now: () => ms }
}

/** New random identifier for non-persisted values such as events and idempotency keys. */
export function newId(): Id {
  return crypto.randomUUID() as Id
}

/** Casts a trusted string (for example a database id) to `Id`. */
export function asId(value: string): Id {
  return value as Id
}

/** Replaces values of sensitive keys with `[redacted]`, one level deep. */
export function redact(fields: LogFields): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, REDACTED_KEYS.has(key.toLowerCase()) ? '[redacted]' : value]),
  )
}

/** Logger writing one JSON line per entry through `write` (console by default). */
export function createJsonLogger(
  write: (line: string) => void = (line) => {
    console.log(line)
  },
): Logger {
  const entry =
    (level: string) =>
    (message: string, fields: LogFields = {}): void => {
      write(JSON.stringify({ level, msg: message, ...redact(fields) }))
    }
  return { debug: entry('debug'), info: entry('info'), warn: entry('warn'), error: entry('error') }
}
