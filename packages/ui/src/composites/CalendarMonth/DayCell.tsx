'use client'

import { useState } from 'react'
import Link from 'next/link'
import { stagePillClass, type StageColor } from '../StagePill/stage'
import type { CalendarEvent } from './types'

const eventClass = (color: StageColor | undefined): string =>
  color === undefined ? 'bg-muted text-foreground' : `${stagePillClass(color)} text-foreground`

function EventCell({ event }: Readonly<{ event: CalendarEvent }>) {
  return (
    <Link
      href={event.href ?? `?event=${event.id}`}
      data-task-link-id={event.id}
      className={`block truncate rounded px-1.5 py-1 text-left text-xs ${eventClass(event.color)}`}
    >
      {event.title}
    </Link>
  )
}

function MoreButton({ count, label, onClick }: Readonly<{ count: number; label: string; onClick: () => void }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs text-muted-foreground hover:underline"
      aria-label={`Show ${String(count)} more task${count === 1 ? '' : 's'}`}
    >
      {label.replace('{count}', String(count))}
    </button>
  )
}

export function DayCell({
  date,
  day,
  events,
  maxVisible = 4,
  moreLabel,
}: Readonly<{
  date: string | null
  day: number
  events: readonly CalendarEvent[]
  maxVisible?: number
  moreLabel: string
}>) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (date === null) {
    return <div className="min-h-20 border-b border-r bg-muted/10 p-1 sm:min-h-28 sm:p-2" />
  }

  const visible = isExpanded ? events : events.slice(0, maxVisible)
  const hidden = events.length - maxVisible

  return (
    <div className="min-h-20 min-w-0 border-b border-r p-1 sm:min-h-28 sm:p-2">
      <time dateTime={date} className="text-xs font-medium text-muted-foreground">
        {day}
      </time>
      <div className="mt-1 space-y-1">
        {visible.map((event) => (
          <EventCell key={event.id} event={event} />
        ))}
        {hidden > 0 && !isExpanded ? (
          <MoreButton
            count={hidden}
            label={moreLabel}
            onClick={() => {
              setIsExpanded(true)
            }}
          />
        ) : null}
        {isExpanded && hidden > 0 ? (
          <button
            type="button"
            onClick={() => {
              setIsExpanded(false)
            }}
            className="text-xs text-muted-foreground hover:underline"
            aria-label="Show fewer tasks"
          >
            − Show less
          </button>
        ) : null}
      </div>
    </div>
  )
}
