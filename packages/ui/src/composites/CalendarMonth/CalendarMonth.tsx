import Link from 'next/link'
import { DayCell } from './DayCell'

import type { CalendarEvent } from './types'

export type { CalendarEvent }

const MAX_VISIBLE_EVENTS = 4
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

/** A compact month grid with deterministic event placement. */
export function CalendarMonth({
  year,
  month,
  events,
  weekStartsOn = 1,
  locale = 'en',
  labels = { previous: 'Previous month', next: 'Next month', more: '+{count} more' },
}: Readonly<{
  year: number
  month: number
  events: readonly CalendarEvent[]
  weekStartsOn?: 0 | 1
  locale?: string
  labels?: Readonly<{ previous: string; next: string; more: string }>
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
              maxVisible={MAX_VISIBLE_EVENTS}
              moreLabel={labels.more}
            />
          )
        })}
      </div>
    </section>
  )
}
