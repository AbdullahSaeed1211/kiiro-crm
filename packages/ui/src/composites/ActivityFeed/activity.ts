import type { ReactNode } from 'react'

/** An already-authorized activity entry supplied by the record page. */
export interface ActivityEntry {
  readonly id: string
  readonly occurredAt: number
  readonly actorName?: string | null
  readonly actorInitials?: string | null
  readonly actorAvatarUrl?: string | null
  /** The translated event text or a rendered description from the caller. */
  readonly summary: ReactNode
}

/** Newest activity first, without changing the server-provided array. */
export function newestFirst(entries: readonly ActivityEntry[]): ActivityEntry[] {
  return [...entries].sort((a, b) => b.occurredAt - a.occurredAt || a.id.localeCompare(b.id))
}

/** Returns the first page of entries and whether another page is available. */
export function activityPage(
  entries: readonly ActivityEntry[],
  pageSize: number,
): { readonly entries: ActivityEntry[]; readonly hasMore: boolean } {
  const safeSize = Math.max(1, Math.floor(pageSize))
  const ordered = newestFirst(entries)
  return { entries: ordered.slice(0, safeSize), hasMore: ordered.length > safeSize }
}
