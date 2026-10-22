import { TASK_COPY } from '../../../i18n/config'
import type { CalendarCopy } from '../../../i18n/calendar-copy'
import type { loadCalendarReadModel } from '../../../server/queries/work/calendar-read-model'
import type { loadTaskPeople } from '../../../server/queries/work/task-details'
import { CalendarWorkspace } from './calendar-workspace'
import { ScheduleEditDialog } from './schedule-edit-dialog'
import { moveTaskOnCalendar } from './move-task'
import type { CalendarEvent } from '@ops/ui/composites/CalendarMonth'

type CalendarModel = Awaited<ReturnType<typeof loadCalendarReadModel>>
type TaskPeople = Awaited<ReturnType<typeof loadTaskPeople>>
type CalendarLayout = 'month' | 'agenda'
type CalendarLinks = Readonly<{ previousHref: string; nextHref: string; todayHref: string; monthHref: string }>

const dateFormatter = (timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })

export function CalendarSurface({
  model,
  people,
  events,
  assignee,
  mine,
  year,
  month,
  layout,
  calendarCopy,
  agendaNavigation,
  selectedSchedule,
}: Readonly<{
  model: CalendarModel
  people: TaskPeople
  events: CalendarEvent[]
  assignee: string
  mine: boolean
  year: number
  month: number
  layout: CalendarLayout
  calendarCopy: CalendarCopy
  agendaNavigation: CalendarLinks
  selectedSchedule: CalendarModel['scheduleItems'][number] | undefined
}>) {
  const copy = TASK_COPY[model.locale]
  const peopleOptions = Array.from(people, ([id, name]) => ({ id, name }))
  const query = [
    mine ? 'view=mine' : '',
    assignee === '' ? '' : `assignee=${encodeURIComponent(assignee)}`,
    layout === 'agenda' ? 'layout=agenda' : '',
  ]
    .filter(Boolean)
    .join('&')
  return (
    <>
      {model.capped ? (
        <p role="status" className="text-sm text-muted-foreground">
          {calendarCopy.capped.replace('{count}', String(model.tasks.length))}
        </p>
      ) : null}
      <CalendarWorkspace
        people={peopleOptions}
        initialAssignee={assignee || model.actorId}
        copy={calendarCopy}
        calendar={{
          year,
          month,
          weekStartsOn: model.weekStartsOn,
          locale: model.locale,
          labels: { previous: copy.previousMonth, next: copy.nextMonth, more: copy.calendarMore, today: copy.today },
          events,
          today: dateFormatter(model.timeZone).format(Date.now()),
          onMove: moveTaskOnCalendar,
          query,
        }}
        layout={layout}
        timeZone={model.timeZone}
        agendaNavigation={agendaNavigation}
      />
      {selectedSchedule === undefined ? null : (
        <ScheduleEditDialog
          item={selectedSchedule}
          people={peopleOptions}
          canAssign={model.manager}
          locale={model.locale}
          timeZone={model.timeZone}
        />
      )}
    </>
  )
}
