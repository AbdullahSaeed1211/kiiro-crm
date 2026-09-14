import type { Role } from '@ops/platform'

export const PEOPLE_COLLECTIONS = {
  users: 'users',
  groups: 'groups',
  invitations: 'invitations',
  notificationPrefs: 'notificationPrefs',
} as const

export const PEOPLE_ROLE_VALUES = ['owner', 'manager', 'staff'] as const satisfies readonly Role[]
export const INVITATION_STATUS_VALUES = ['pending', 'accepted', 'revoked', 'expired'] as const
export const NOTIFICATION_PREF_TYPES = [
  'assigned',
  'mentioned',
  'due_soon',
  'overdue',
  'digest',
  'intake_received',
  'email_received',
  'invitation_accepted',
  'stalled',
] as const
