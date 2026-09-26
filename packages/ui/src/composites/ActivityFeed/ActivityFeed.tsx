'use client'

import { useMemo } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@ops/ui/components/ui/avatar'
import { Button } from '@ops/ui/components/ui/button'
import { formatUTCDateTime } from '../../lib/dates'
import { newestFirst, type ActivityEntry } from './activity'

/** Translated strings and formatting supplied by the page. */
export type ActivityFeedLabels = Readonly<{
  heading: string
  empty: string
  loadMore: string
  systemActor: string
}>

export type ActivityFeedProps = Readonly<{
  entries: readonly ActivityEntry[]
  labels: ActivityFeedLabels
  /** Called after the caller has loaded the next page. */
  onLoadMore?: () => void
  hasMore?: boolean
  locale?: string
  className?: string | undefined
}>

function ActivityTime({ timestamp }: Readonly<{ timestamp: number }>) {
  const value = formatUTCDateTime(timestamp)
  return (
    <time dateTime={new Date(timestamp).toISOString()} className="text-xs text-muted-foreground">
      {value}
    </time>
  )
}

/** Compact audit timeline. It renders supplied entries only; loading remains the page's responsibility. */
export function ActivityFeed({ entries, labels, onLoadMore, hasMore = false, className }: ActivityFeedProps) {
  const ordered = useMemo(() => newestFirst(entries), [entries])
  return (
    <section aria-labelledby="activity-feed-heading" className={className}>
      <h2 id="activity-feed-heading" className="mb-3 text-sm font-medium">
        {labels.heading}
      </h2>
      {ordered.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{labels.empty}</p>
      ) : (
        <ol className="relative flex flex-col gap-4 border-l pl-4">
          {ordered.map((entry) => (
            <li key={entry.id} className="relative flex gap-3">
              <Avatar size="sm" className="absolute -left-[1.9rem] bg-background">
                {entry.actorAvatarUrl === null || entry.actorAvatarUrl === undefined ? null : (
                  <AvatarImage src={entry.actorAvatarUrl} alt="" />
                )}
                <AvatarFallback>
                  {entry.actorInitials ?? (entry.actorName ?? labels.systemActor).slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                  <span className="text-sm font-medium">{entry.actorName ?? labels.systemActor}</span>
                  <ActivityTime timestamp={entry.occurredAt} />
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{entry.summary}</div>
              </div>
            </li>
          ))}
        </ol>
      )}
      {hasMore && onLoadMore !== undefined ? (
        <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={onLoadMore}>
          {labels.loadMore}
        </Button>
      ) : null}
    </section>
  )
}
