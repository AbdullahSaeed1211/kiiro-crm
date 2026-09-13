import type { NotificationInput, NotificationStore } from '@ops/platform'
import type { Payload } from 'payload'
import { COLLECTIONS, FIELDS } from '../contracts/names'
import { insertUnique } from './unique-insert'

const DEDUPE_FIELD = 'dedupeKey'

function toNotificationData(input: NotificationInput): Record<string, unknown> {
  const { record, actorId } = input
  const reference = record === undefined ? {} : { recordType: record.type, recordId: record.id }
  const actor = actorId === undefined ? {} : { actor: actorId }
  const base = { [FIELDS.user]: input.userId, type: input.type, [DEDUPE_FIELD]: input.dedupeKey, data: input.data }
  return { ...base, ...reference, ...actor }
}

/** `NotificationStore` on the Payload Local API; inserts are system work deduplicated on the unique `dedupeKey`. */
export function createNotificationStore(payload: Payload): NotificationStore {
  return {
    insertIfAbsent: (input) =>
      insertUnique(payload, {
        collection: COLLECTIONS.notifications,
        field: DEDUPE_FIELD,
        value: input.dedupeKey,
        data: toNotificationData(input),
      }),
  }
}
