'use client'

import { CalendarDays, ListTodo, PhoneCall } from 'lucide-react'
import Link from 'next/link'
import type { CalendarEvent } from '@ops/ui/composites/CalendarMonth'
import { Button } from '@ops/ui/components/ui/button'
import { stagePillClass } from '@ops/ui/composites/StagePill'
import { formatDate } from '../../../i18n/format'
import type { CalendarCopy } from '../../../i18n/calendar-copy'

type AgendaEntry = Readonly<{
  kind: string
  title: string
  time?: string
  icon: typeof ListTodo
}>

function scheduleEntry(event: CalendarEvent, copy: CalendarCopy): AgendaEntry | undefined {
  const divider = ' · '
  const kindEnd = event.title.indexOf(divider)
  if (kindEnd < 0) return undefined
  const kind = event.title.slice(0, kindEnd)
  if (kind !== copy.callback && kind !== copy.appointment) return undefined
  const timeStart = kindEnd + divider.length
  const titleStart = event.title.indexOf(divider, timeStart)
  if (titleStart < 0) return undefined
  return {
    kind,
    time: event.title.slice(timeStart, titleStart),
    title: event.title.slice(titleStart + divider.length),
    icon: kind === copy.callback ? PhoneCall : CalendarDays,
  }
}

function agendaEntry(event: CalendarEvent, copy: CalendarCopy): AgendaEntry {
  return scheduleEntry(event, copy) ?? { kind: copy.task, title: event.title, icon: ListTodo }
}

function dateLabel(date: string, locale: string): string {
  return formatDate(new Date(`${date}T12:00:00.000Z`), locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function monthLabel({ year, month, locale }: Readonly<{ year: number; month: number; locale: string }>): string {
  return formatDate(Date.UTC(year, month, 1), locale, { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function groupsOf(
  events: readonly CalendarEvent[],
): readonly Readonly<{ date: string; events: readonly CalendarEvent[] }>[] {
  const groups = new Map<string, CalendarEvent[]>()
  for (const event of events) groups.set(event.date, [...(groups.get(event.date) ?? []), event])
  return Array.from(groups, ([date, grouped]) => ({
    date,
    events: grouped,
  })).toSorted((first, second) => first.date.localeCompare(second.date))
}

function AgendaEvent({ event, copy }: Readonly<{ event: CalendarEvent; copy: CalendarCopy }>) {
  const entry = agendaEntry(event, copy)
  const Icon = entry.icon
  const colorClass =
    event.color === undefined ? 'bg-muted text-foreground' : `${stagePillClass(event.color)} text-foreground`
  const accessibleTitle = [entry.kind, entry.time, entry.title].filter(Boolean).join(' · ')
  return (
    <li>
      <Link
        href={event.href ?? `?event=${encodeURIComponent(event.id)}`}
        scroll={false}
        aria-label={accessibleTitle}
        title={event.tooltip ?? accessibleTitle}
        className="flex min-w-0 items-start gap-3 rounded-md border px-3 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs font-medium ${colorClass}`}
        >
          <Icon aria-hidden="true" className="size-3.5" />
          {entry.kind}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-words text-sm font-medium">{entry.title}</span>
          {entry.time === undefined ? null : (
            <span className="mt-1 block text-xs text-muted-foreground">{entry.time}</span>
          )}
        </span>
      </Link>
    </li>
  )
}

function AgendaHeader({
  monthText,
  previousHref,
  nextHref,
  todayHref,
  copy,
}: Readonly<{
  monthText: string
  previousHref: string
  nextHref: string
  todayHref: string
  copy: CalendarCopy
}>) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
      <h2 className="text-sm font-semibold">{monthText}</h2>
      <nav aria-label={copy.agenda} className="flex items-center gap-1">
        <Link
          href={previousHref}
          scroll={false}
          aria-label={copy.previousMonth}
          className="rounded px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          ←
        </Link>
        <Link
          href={todayHref}
          scroll={false}
          className="rounded border px-2 py-1 text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {copy.today}
        </Link>
        <Link
          href={nextHref}
          scroll={false}
          aria-label={copy.nextMonth}
          className="rounded px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          →
        </Link>
      </nav>
    </header>
  )
}

function AgendaGroups({
  groups,
  locale,
  monthHref,
  copy,
  onCreate,
}: Readonly<{
  groups: ReturnType<typeof groupsOf>
  locale: string
  monthHref: string
  copy: CalendarCopy
  onCreate: (date: string) => void
}>) {
  if (groups.length === 0) {
    return (
      <div className="grid justify-items-start gap-3 px-4 py-8">
        <p className="text-sm text-muted-foreground">{copy.noAgendaEvents}</p>
        <Link
          href={monthHref}
          className="inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {copy.openMonthToAdd}
        </Link>
      </div>
    )
  }
  return (
    <ol className="divide-y">
      {groups.map((group) => (
        <li key={group.date} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(10rem,14rem)_1fr] sm:gap-5">
          <div className="flex items-start justify-between gap-2 sm:block">
            <h3 className="text-sm font-semibold">{dateLabel(group.date, locale)}</h3>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              className="shrink-0"
              onClick={() => {
                onCreate(group.date)
              }}
            >
              + {copy.add}
            </Button>
          </div>
          <ul className="grid min-w-0 gap-2">
            {group.events.map((event) => (
              <AgendaEvent key={event.id} event={event} copy={copy} />
            ))}
          </ul>
        </li>
      ))}
    </ol>
  )
}

export function CalendarAgenda({
  year,
  month,
  locale,
  timeZone,
  events,
  previousHref,
  nextHref,
  todayHref,
  monthHref,
  copy,
  onCreate,
}: Readonly<{
  year: number
  month: number
  locale: string
  timeZone: string
  events: readonly CalendarEvent[]
  previousHref: string
  nextHref: string
  todayHref: string
  monthHref: string
  copy: CalendarCopy
  onCreate: (date: string) => void
}>) {
  const groups = groupsOf(events)
  const monthText = monthLabel({ year, month, locale })
  return (
    <section
      aria-label={`${monthText} ${copy.agenda}`}
      className="ops-surface-card min-w-0 overflow-hidden rounded-lg border bg-card"
    >
      <AgendaHeader
        monthText={monthText}
        previousHref={previousHref}
        nextHref={nextHref}
        todayHref={todayHref}
        copy={copy}
      />
      <p className="border-b px-4 py-2 text-xs text-muted-foreground">
        {copy.agendaTimeZone.replace('{timeZone}', timeZone)}
      </p>
      <AgendaGroups groups={groups} locale={locale} monthHref={monthHref} copy={copy} onCreate={onCreate} />
    </section>
  )
}
