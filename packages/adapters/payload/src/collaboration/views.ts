export type ViewKind = 'table' | 'board' | 'calendar' | 'timeline'

export interface SavedViewInput {
  readonly recordType: string
  readonly owner: string | null
  readonly name: string
  readonly kind: ViewKind
  readonly filter: object | null
  readonly sort: object
  readonly columns: readonly string[]
  readonly pinned: boolean
  readonly isDefault: boolean
}

/** Enforces the personal saved-view cap before a create is sent to Payload. */
export function canCreatePersonalView(personalCount: number, isShared: boolean): boolean {
  return isShared || personalCount < 30
}

/** Shared views are manager-owned; personal views belong to the current actor. */
export function canManageView(input: { owner: string | null; actorId: string; managerUp: boolean }): boolean {
  return input.owner === null ? input.managerUp : input.owner === input.actorId || input.managerUp
}

/** Returns the default channel settings for a new user. */
export function defaultNotificationPreferences(role: 'owner' | 'manager' | 'staff') {
  const enabled = ['assigned', 'mentioned', 'intake_received', 'email_received', 'due_soon', 'overdue', 'stalled']
  const channels = Object.fromEntries(
    [...enabled, 'digest'].map((type) => [type, { inApp: type !== 'digest', email: type !== 'digest' }]),
  )
  return { channels, digestLocalTime: role === 'staff' ? null : '08:00' }
}
