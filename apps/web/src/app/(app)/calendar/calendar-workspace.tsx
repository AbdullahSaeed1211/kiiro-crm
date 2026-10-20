'use client'

import { useState, type ComponentProps } from 'react'
import { CalendarMonth } from '@ops/ui/composites/CalendarMonth'
import { CalendarCreateDialog } from './calendar-create-dialog'
import type { CalendarCopy } from '../../../i18n/calendar-copy'

/** Keeps quick creation in an overlay so the calendar and scroll position stay in place. */
export function CalendarWorkspace({
  calendar,
  people,
  initialAssignee,
  copy,
}: Readonly<{
  calendar: ComponentProps<typeof CalendarMonth>
  people: readonly Readonly<{ id: string; name: string }>[]
  initialAssignee: string
  copy: CalendarCopy
}>) {
  const [date, setDate] = useState<string>()
  return (
    <>
      <p className="text-xs text-muted-foreground">{copy.hint}</p>
      <CalendarMonth {...calendar} creation={{ label: copy.add, onCreate: setDate }} />
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
