import type { Id } from '@ops/kernel'
import type { NotificationStore } from '@ops/platform'

export interface NotificationRecord {
  readonly id: Id
  readonly userId: Id
  readonly type: string
  readonly recordType?: string
  readonly recordId?: Id
  readonly actorId?: Id
  readonly data?: Readonly<Record<string, unknown>>
  readonly readAt?: number
  readonly createdAt: number
}

/** Inserts a notification while making repeated event delivery harmless. */
export function notifyOnce(store: NotificationStore, input: Parameters<NotificationStore['insertIfAbsent']>[0]) {
  return store.insertIfAbsent(input)
}

/** Count unread notifications without exposing another user's rows to the caller. */
export function unreadCount(records: readonly NotificationRecord[], userId: Id): number {
  return records.filter((record) => record.userId === userId && record.readAt === undefined).length
}
