import type { Id } from '@ops/kernel'
import type { NotificationStore } from '@ops/platform'
import { asId } from '@ops/kernel'

const MENTION_TOKEN = /@\[([^\]]{1,120})\]\(([^)\s]{1,120})\)/g

/** Extracts unique user ids from composer tokens without trusting the display name. */
export function parseMentions(body: string): Id[] {
  const ids = new Set<Id>()
  for (const match of body.matchAll(MENTION_TOKEN)) {
    const id = match[2]
    if (id !== undefined) ids.add(asId(id))
  }
  return [...ids]
}

export interface MentionFanout {
  readonly commentId: Id
  readonly recordType: string
  readonly recordId: Id
  readonly authorId: Id
  readonly mentions: readonly Id[]
  readonly actorId?: Id
  readonly data?: Readonly<Record<string, unknown>>
}

/** Inserts one deduplicated `mentioned` notification per active, non-author mention. */
export async function fanOutMentions(
  input: MentionFanout,
  deps: { readonly notifications: NotificationStore; readonly isActiveUser: (id: Id) => Promise<boolean> },
): Promise<readonly Id[]> {
  const recipients: Id[] = []
  for (const userId of new Set(input.mentions)) {
    if (userId === input.authorId || !(await deps.isActiveUser(userId))) continue
    await deps.notifications.insertIfAbsent({
      userId,
      type: 'mentioned',
      dedupeKey: `mention:${input.commentId}:${userId}`,
      record: { type: input.recordType, id: input.recordId },
      actorId: input.actorId ?? input.authorId,
      data: { ...input.data, commentId: input.commentId },
    })
    recipients.push(userId)
  }
  return recipients
}
