import type { ActionResult } from '../../../server/action-result'

export type InviteAction = (input: unknown) => Promise<ActionResult<{ token: string; inviteUrl: string }>>
export type GroupAction = (input: unknown) => Promise<ActionResult>
export type ResendAction = (input: unknown) => Promise<ActionResult<{ inviteUrl: string }>>
export type RevokeAction = (input: unknown) => Promise<ActionResult>
export type MemberAction = (input: unknown) => Promise<ActionResult>

export function formText(values: FormData, key: string): string {
  const value = values.get(key)
  return typeof value === 'string' ? value : ''
}
