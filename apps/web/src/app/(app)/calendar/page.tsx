import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import type { Metadata } from 'next'
import { TASK_COPY } from '../../../i18n/config'
import { CALENDAR_COPY } from '../../../i18n/calendar-copy'
import type { CalendarCopy } from '../../../i18n/calendar-copy'
import { catalogFor } from '../../../i18n/locale'
import { loadCalendarReadModel } from '../../../server/queries/work/calendar-read-model'
import { loadTaskPeople } from '../../../server/queries/work/task-details'
import { AssigneeFilter } from '../tasks/AssigneeFilter'
import { assigneeOptions, validAssignee } from '../tasks/assignee-options'
import { moveTaskOnCalendar } from './move-task'
import { TaskWorkspaceViews } from '../tasks/TaskWorkspaceViews'
import { CalendarWorkspace } from './calendar-workspace'
import { ScheduleEditDialog } from './schedule-edit-dialog'
import { buildCalendarEvents } from './calendar-event-model'
import type { CalendarEvent } from '@ops/ui/composites/CalendarMonth'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Calendar' }
/** The view and assignee choices that the previous, next and Today links keep. */
function carriedQuery({ mine, assignee }: Readonly<{ mine: boolean; assignee: string }>): string {
  return [mine ? 'view=mine' : '', assignee === '' ? '' : `assignee=${encodeURIComponent(assignee)}`]
    .filter(Boolean)
    .join('&')
}

function calendarReturnTo({
  year,
  month,
  mine,
  assignee,
}: Readonly<{
  year: number
  month: number
  mine: boolean
  assignee: string
}>): string {
  const params = new URLSearchParams(carriedQuery({ mine, assignee }))
  params.set('year', String(year))
  params.set('month', String(month + 1))
  return `/calendar?${params.toString()}`
}

const dateFormatter = (timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

type CalendarModel = Awaited<ReturnType<typeof loadCalendarReadModel>>
type TaskPeople = Awaited<ReturnType<typeof loadTaskPeople>>

function CalendarEventContent({
  model,
  people,
  events,
  copy,
  calendarCopy,
  assignee,
  mine,
  year,
  month,
  selectedSchedule,
}: Readonly<{
  model: CalendarModel
  people: TaskPeople
  events: CalendarEvent[]
  copy: (typeof TASK_COPY)[keyof typeof TASK_COPY]
  calendarCopy: CalendarCopy
  assignee: string
  mine: boolean
  year: number
  month: number
  selectedSchedule: CalendarModel['scheduleItems'][number] | undefined
}>) {
  const query = carriedQuery({ mine, assignee })
  const peopleOptions = Array.from(people, ([id, name]) => ({ id, name }))
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
/** Month calendar for scoped tasks and scheduled sales activity. */
export default async function CalendarPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{
    readonly month?: string
    readonly year?: string
    readonly view?: string
    readonly assignee?: string
    readonly event?: string
  }>
}>) {
  const query = await searchParams
  const requestedMine = query.view === 'mine'
  const people = await loadTaskPeople()
  const requestedAssignee = validAssignee(query.assignee, people)
  const model = await loadCalendarReadModel({
    year: query.year,
    month: query.month,
    mine: requestedMine,
    assignee: requestedAssignee,
  })
  const mine = requestedMine || !model.manager
  const assignee = model.manager ? requestedAssignee : ''
  const year = model.calendarYear
  const month = model.calendarMonth
  const copy = TASK_COPY[model.locale]
  const calendarCopy = catalogFor(CALENDAR_COPY, model.locale)
  const returnTo = calendarReturnTo({ year, month, mine, assignee })
  const selectedSchedule =
    query.event === undefined ? undefined : model.scheduleItems.find((item) => item.id === query.event)
  const events = buildCalendarEvents({
    tasks: model.tasks,
    scheduleItems: model.scheduleItems,
    year,
    month,
    timeZone: model.timeZone,
    locale: model.locale,
    copy: calendarCopy,
    returnTo,
    carriedQuery: carriedQuery({ mine, assignee }),
  })
  return (
    <>
      <AppHeader breadcrumbs={[{ label: copy.calendar }]} />
      <PageContent>
        <PageHeader
          title={copy.calendar}
          description={copy.calendarDescription}
          actions={
            <>
              {model.manager ? (
                <AssigneeFilter
                  value={assignee}
                  label={copy.assignee}
                  allLabel={copy.anyAssignee}
                  options={assigneeOptions(people)}
                />
              ) : null}
              <TaskWorkspaceViews active="calendar" locale={model.locale} mine={mine} />
            </>
          }
        />
        <CalendarEventContent
          model={model}
          people={people}
          events={events}
          copy={copy}
          calendarCopy={calendarCopy}
          assignee={assignee}
          mine={mine}
          year={year}
          month={month}
          selectedSchedule={selectedSchedule}
        />
      </PageContent>
    </>
  )
}
