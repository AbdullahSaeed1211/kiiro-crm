import { domainError, err } from '@ops/kernel'
import type { Actor } from '@ops/platform'
import type { WorkResult } from '../ports/work'

/** Builds a failed work result. */
export const fail = <T>(code: Parameters<typeof domainError>[0], message: string): WorkResult<T> =>
  err(domainError(code, message))

/** Returns whether the actor is an owner or manager. */
export const isManagerUp = (actor: Actor): boolean => actor.role === 'owner' || actor.role === 'manager'
