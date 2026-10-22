'use client'

import { useState, type ComponentProps } from 'react'
import { CalendarMonth } from '@ops/ui/composites/CalendarMonth'
import { CalendarCreateDialog } from './calendar-create-dialog'
import { CalendarAgenda } from './CalendarAgenda'
import type { CalendarCopy } from '../../../i18n/calendar-copy'

/** Keeps quick creation in an overlay so the calendar and scroll position stay in place. */
export function CalendarWorkspace({
  calendar,
  people,
  initialAssignee,
  copy,
  layout,
  timeZone,
  agendaNavigation,
}: Readonly<{
  calendar: ComponentProps<typeof CalendarMonth>
  people: readonly Readonly<{ id: string; name: string }>[]
  initialAssignee: string
  copy: CalendarCopy
  layout: 'month' | 'agenda'
  timeZone: string
  agendaNavigation: Readonly<{
    previousHref: string
    nextHref: string
    todayHref: string
    monthHref: string
  }>
}>) {
  const [date, setDate] = useState<string>()
  return (
    <>
      <p className="text-xs text-muted-foreground">{layout === 'agenda' ? copy.agendaHint : copy.hint}</p>
      {layout === 'agenda' ? (
        <CalendarAgenda
          year={calendar.year}
          month={calendar.month}
          locale={calendar.locale ?? 'en'}
          timeZone={timeZone}
          events={calendar.events}
          {...agendaNavigation}
          copy={copy}
          onCreate={setDate}
        />
      ) : (
        <CalendarMonth {...calendar} creation={{ label: copy.add, onCreate: setDate }} />
      )}
      {date === undefined ? null : (
        <CalendarCreateDialog
          key={date}
          date={date}
          people={people}
          initialAssignee={initialAssignee}
          copy={copy}
          onClose={() => {
            setDate(undefined)
          }}
        />
      )}
    </>
  )
}
