/** Reads a server-action argument as a plain object, or an empty one. */
export const recordOf = (input: unknown): Record<string, unknown> =>
  typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {}

/** A non-blank string value, trimmed, or undefined. */
export const stringValue = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
