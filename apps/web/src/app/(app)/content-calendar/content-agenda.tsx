'use client'

import Link from 'next/link'
import type { CalendarEvent } from '@ops/ui/composites/CalendarMonth'
import type { AgencyWorkCopy } from '../../../i18n/agency-work-copy'

export function ContentAgenda({
  events,
  locale,
  copy,
}: Readonly<{ events: readonly CalendarEvent[]; locale: string; copy: AgencyWorkCopy }>) {
  const ordered = [...events].sort(
    (left, right) => left.date.localeCompare(right.date) || left.title.localeCompare(right.title),
  )
  return (
    <section className="grid gap-2 md:hidden" aria-labelledby="content-agenda-title">
      <h2 id="content-agenda-title" className="text-sm font-semibold">
        {copy.contentAgenda}
      </h2>
      {ordered.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{copy.noContent}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {ordered.map((event) => (
            <li key={event.id} className="flex items-start gap-3 p-3">
              <time dateTime={event.date} className="w-24 shrink-0 text-xs text-muted-foreground">
                {new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  timeZone: 'UTC',
                }).format(Date.parse(`${event.date}T12:00:00Z`))}
              </time>
              {event.href === undefined ? (
                <span className="min-w-0 font-medium">{event.title}</span>
              ) : (
                <Link href={event.href} className="min-w-0 font-medium hover:underline">
                  {event.title}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
