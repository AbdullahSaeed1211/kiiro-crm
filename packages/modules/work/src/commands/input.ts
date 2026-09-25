import { domainError, err } from '@ops/kernel'
import type { Actor } from '@ops/platform'
import type { WorkResult } from '../ports/work'

/** Builds a failed work result. */
export const fail = <T>(code: Parameters<typeof domainError>[0], message: string): WorkResult<T> =>
  err(domainError(code, message))

/** Narrows untrusted command input to a plain record, or `undefined` when it is not an object. */
export const objectInput = (input: unknown): Record<string, unknown> | undefined =>
  typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : undefined

/** Returns whether the actor is an owner or manager. */
export const isManagerUp = (actor: Actor): boolean => actor.role === 'owner' || actor.role === 'manager'

/** Accepts `null` (cleared) or a finite epoch-millisecond number. */
export const validDate = (value: unknown): value is number | null =>
  value === null || (typeof value === 'number' && Number.isFinite(value))
