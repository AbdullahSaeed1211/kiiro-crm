import type { NotificationInput, NotificationStore } from '@ops/platform'

/** In-memory `NotificationStore` enforcing dedupe-key uniqueness like the unique index in persistence. */
export class InMemoryNotificationStore implements NotificationStore {
  readonly rows = new Map<string, NotificationInput>()

  insertIfAbsent(input: NotificationInput): Promise<'created' | 'duplicate'> {
    if (this.rows.has(input.dedupeKey)) return Promise.resolve('duplicate')
    this.rows.set(input.dedupeKey, input)
    return Promise.resolve('created')
  }
}
