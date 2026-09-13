import type { Id } from '@ops/kernel'
import type { RecordRef } from './records'

/** Notification kinds (spec §9.8). */
export type NotificationType =
  | 'assigned'
  | 'mentioned'
  | 'due_soon'
  | 'overdue'
  | 'digest'
  | 'intake_received'
  | 'email_received'
  | 'invitation_accepted'
  | 'stalled'

/** A notification to insert; `dedupeKey` is unique, so repeating an insert never creates a duplicate. */
export interface NotificationInput {
  readonly userId: Id
  readonly type: NotificationType
  readonly dedupeKey: string
  readonly record?: RecordRef
  readonly actorId?: Id
  readonly data: Readonly<Record<string, unknown>>
}

/** Persistence for `notify`: `created` on insert, `duplicate` when the dedupe key already exists. */
export interface NotificationStore {
  insertIfAbsent(input: NotificationInput): Promise<'created' | 'duplicate'>
}
