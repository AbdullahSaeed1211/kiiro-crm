import type { ReactNode } from 'react'
import Link from 'next/link'

export interface CalendarEvent {
  readonly id: string
  readonly title: string
  readonly date: string
  readonly href?: string
  readonly tone?: 'default' | 'blue' | 'green' | 'amber' | 'red' | 'violet'
  readonly meta?: ReactNode
}
const TONES: Record<NonNullable<CalendarEvent['tone']>, string> = {
  default: 'bg-muted text-foreground',
  blue: 'bg-stage-blue/15 text-foreground',
  green: 'bg-stage-green/15 text-foreground',
  amber: 'bg-stage-amber/15 text-foreground',
  red: 'bg-destructive/10 text-destructive',
  violet: 'bg-stage-violet/15 text-foreground',
}
const pad = (value: number): string => String(value).padStart(2, '0')
const dateKey = (input: { readonly year: number; readonly month: number; readonly day: number }): string =>
  `${String(input.year).padStart(4, '0')}-${pad(input.month + 1)}-${pad(input.day)}`
function firstWeekday(input: { readonly year: number; readonly month: number; readonly weekStartsOn: 0 | 1 }): number {
  const day = new Date(Date.UTC(input.year, input.month, 1)).getUTCDay()
  return (day - input.weekStartsOn + 7) % 7
}
function monthHref(input: { readonly year: number; readonly month: number; readonly delta: number }): string {
  const next = new Date(Date.UTC(input.year, input.month + input.delta, 1))
  return `?month=${String(next.getUTCMonth() + 1)}&year=${String(next.getUTCFullYear())}`
}
function EventCell({ event }: Readonly<{ event: CalendarEvent }>) {
  return (
    <Link
      href={event.href ?? `?event=${event.id}`}
      data-task-link-id={event.id}
      className={`block truncate rounded px-1.5 py-1 text-left text-xs ${TONES[event.tone ?? 'default']}`}
    >
      {event.title}
    </Link>
  )
}
function DayCell({
  date,
  day,
  events,
}: Readonly<{ date: string | null; day: number; events: readonly CalendarEvent[] }>) {
  if (date === null) return <div className="min-h-20 border-b border-r bg-muted/10 p-1 sm:min-h-28 sm:p-2" />
  return (
    <div className="min-h-20 min-w-0 border-b border-r p-1 sm:min-h-28 sm:p-2">
      <time dateTime={date} className="text-xs font-medium text-muted-foreground">
        {day}
      </time>
      <div className="mt-1 space-y-1">
        {events.slice(0, 4).map((event) => (
          <EventCell key={event.id} event={event} />
        ))}
        {events.length > 4 ? <span className="text-xs text-muted-foreground">+{events.length - 4} more</span> : null}
      </div>
    </div>
  )
}

/** A compact month grid with deterministic event placement. */
export function CalendarMonth({
  year,
  month,
  events,
  weekStartsOn = 1,
  locale = 'en',
  labels = { previous: 'Previous month', next: 'Next month' },
}: Readonly<{
  year: number
  month: number
  events: readonly CalendarEvent[]
  weekStartsOn?: 0 | 1
  locale?: string
  labels?: Readonly<{ previous: string; next: string }>
}>) {
  const leading = firstWeekday({ year, month, weekStartsOn })
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const cells = Math.ceil((leading + days) / 7) * 7
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    Date.UTC(year, month, 1),
  )
  const byDate = new Map<string, CalendarEvent[]>()
  for (const event of events) byDate.set(event.date, [...(byDate.get(event.date) ?? []), event])
  const weekdayFormatter = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' })
  const sunday = Array.from({ length: 7 }, (_, index) => weekdayFormatter.format(Date.UTC(2024, 0, 7 + index)))
  const weekdays = weekStartsOn === 1 ? [...sunday.slice(1), sunday[0]] : sunday
  return (
    <section aria-label={monthLabel} className="ops-surface-card min-w-0 overflow-hidden rounded-lg border bg-card">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <Link
          className="text-sm text-muted-foreground hover:text-foreground"
          href={monthHref({ year, month, delta: -1 })}
          aria-label={labels.previous}
        >
          ←
        </Link>
        <h2 className="text-sm font-semibold">{monthLabel}</h2>
        <Link
          className="text-sm text-muted-foreground hover:text-foreground"
          href={monthHref({ year, month, delta: 1 })}
          aria-label={labels.next}
        >
          →
        </Link>
      </header>
      <div className="grid min-w-0 grid-cols-7 border-b bg-muted/30">
        {weekdays.map((day) => (
          <div
            key={day}
            className="min-w-0 px-0.5 py-2 text-center text-[10px] font-medium text-muted-foreground sm:px-2 sm:text-xs"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid min-w-0 grid-cols-7">
        {Array.from({ length: cells }, (_, index) => {
          const day = index - leading + 1
          const date = day < 1 || day > days ? null : dateKey({ year, month, day })
          return (
            <DayCell
              key={date ?? `empty-${String(index)}`}
              date={date}
              day={day}
              events={date === null ? [] : (byDate.get(date) ?? [])}
            />
          )
        })}
      </div>
    </section>
  )
}
