import { domainError, err, invalidInput, ok, type Result } from '@ops/kernel'
import type { Actor, Role } from '@ops/platform'
import type { z } from 'zod'
import type { VoiceMode } from './voice-contracts'
import type { VoiceProvider } from './ports/voice-provider'
import type { VoiceRepository } from './ports/voice'

export interface VoiceEngineDeps {
  readonly actor: Actor
  readonly repo: VoiceRepository
  readonly provider: VoiceProvider | null
  readonly mode: VoiceMode
  readonly configured: boolean
  readonly production: boolean
  readonly offerSigningSecret: string
  readonly now: () => number
}

export type VoiceResult<T> = Result<T>

/** Calling administration follows the workspace owner and manager permissions. */
export const canManage = (role: Role) => role === 'owner' || role === 'manager'
/** A safe response when tenant calling setup is incomplete. */
export const unavailable = <T>() =>
  err(domainError('UNAVAILABLE', 'Calling is not configured for this workspace.')) as VoiceResult<T>
/** Rejects a calling action outside the authenticated user's scope. */
export const forbidden = <T>() =>
  err(domainError('FORBIDDEN', 'You do not have access to this calling action.')) as VoiceResult<T>
/** Reports a reservation or state that cannot be reused for this action. */
export const conflict = <T>(message: string) => err(domainError('CONFLICT', message)) as VoiceResult<T>

/** Validates an unknown command payload through its owned schema. */
export function parse<S extends z.ZodType>(schema: S, input: unknown): VoiceResult<z.output<S>> {
  const result = schema.safeParse(input)
  if (result.success) return ok(result.data)
  return err(invalidInput('The request is invalid.', result.error.issues))
}
