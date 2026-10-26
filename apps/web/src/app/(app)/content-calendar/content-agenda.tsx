'use client'

import Link from 'next/link'
import type { CalendarEvent } from '@ops/ui/composites/CalendarMonth'
import type { AgencyWorkCopy } from '../../../i18n/agency-work-copy'

function monthHref(input: { year: number; month: number; delta: number; projectId: string }) {
  const next = new Date(Date.UTC(input.year, input.month - 1 + input.delta, 1))
  const params = new URLSearchParams({ year: String(next.getUTCFullYear()), month: String(next.getUTCMonth() + 1) })
  if (input.projectId !== '') params.set('projectId', input.projectId)
  return `/content-calendar?${params.toString()}`
}

function ContentAgendaHeader({
  copy,
  locale,
  year,
  month,
  todayYear,
  todayMonth,
  projectId,
}: Readonly<{
  copy: AgencyWorkCopy
  locale: string
  year: number
  month: number
  todayYear: number
  todayMonth: number
  projectId: string
}>) {
  const todayParams = new URLSearchParams({ year: String(todayYear), month: String(todayMonth) })
  if (projectId !== '') todayParams.set('projectId', projectId)
  return (
    <header className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <h2 id="content-agenda-title" className="text-sm font-semibold">
          {copy.contentAgenda}
        </h2>
        <p className="text-xs text-muted-foreground">
          {new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-US', {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
          }).format(Date.UTC(year, month - 1, 1))}
        </p>
      </div>
      <nav className="flex shrink-0 items-center gap-1" aria-label={copy.contentAgenda}>
        <Link
          className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-3 text-sm hover:bg-muted"
          href={monthHref({ year, month, delta: -1, projectId })}
          aria-label={copy.previousMonth}
        >
          ←
        </Link>
        <Link
          className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-3 text-sm hover:bg-muted"
          href={`/content-calendar?${todayParams.toString()}`}
        >
          {copy.today}
        </Link>
        <Link
          className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-3 text-sm hover:bg-muted"
          href={monthHref({ year, month, delta: 1, projectId })}
          aria-label={copy.nextMonth}
        >
          →
        </Link>
      </nav>
    </header>
  )
}

export function ContentAgenda({
  events,
  locale,
  copy,
  year,
  month,
  todayYear,
  todayMonth,
  projectId,
}: Readonly<{
  events: readonly CalendarEvent[]
  locale: string
  copy: AgencyWorkCopy
  year: number
  month: number
  todayYear: number
  todayMonth: number
  projectId: string
}>) {
  const ordered = [...events].sort(
    (left, right) => left.date.localeCompare(right.date) || left.title.localeCompare(right.title),
  )
  return (
    <section className="grid gap-2 md:hidden" aria-labelledby="content-agenda-title">
      <ContentAgendaHeader
        copy={copy}
        locale={locale}
        year={year}
        month={month}
        todayYear={todayYear}
        todayMonth={todayMonth}
        projectId={projectId}
      />
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
