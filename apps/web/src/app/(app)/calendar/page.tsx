import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import type { Metadata } from 'next'
import { TASK_COPY } from '../../../i18n/config'
import { CALENDAR_COPY } from '../../../i18n/calendar-copy'
import { catalogFor } from '../../../i18n/locale'
import { loadCalendarReadModel } from '../../../server/queries/work/calendar-read-model'
import { loadTaskPeople } from '../../../server/queries/work/task-details'
import { AssigneeFilter } from '../tasks/AssigneeFilter'
import { assigneeOptions, validAssignee } from '../tasks/assignee-options'
import { TaskWorkspaceViews } from '../tasks/TaskWorkspaceViews'
import { CalendarSurface } from './CalendarSurface'
import { CalendarLayoutToggle } from './CalendarLayoutToggle'
import { buildCalendarEvents } from './calendar-event-model'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Calendar' }
type CalendarLayout = 'month' | 'agenda'

/** Scope and layout choices carried by calendar navigation and event links. */
function carriedQuery({
  mine,
  assignee,
  layout = 'month',
}: Readonly<{ mine: boolean; assignee: string; layout?: CalendarLayout }>): string {
  return [
    mine ? 'view=mine' : '',
    assignee === '' ? '' : `assignee=${encodeURIComponent(assignee)}`,
    layout === 'agenda' ? 'layout=agenda' : '',
  ]
    .filter(Boolean)
    .join('&')
}

function calendarReturnTo({
  year,
  month,
  mine,
  assignee,
  layout = 'month',
  event,
}: Readonly<{
  year: number
  month: number
  mine: boolean
  assignee: string
  layout?: CalendarLayout
  event?: string
}>): string {
  const params = new URLSearchParams(carriedQuery({ mine, assignee, layout }))
  params.set('year', String(year))
  params.set('month', String(month + 1))
  if (event !== undefined) params.set('event', event)
  return `/calendar?${params.toString()}`
}

function shiftedHref({
  year,
  month,
  delta,
  mine,
  assignee,
  event,
}: Readonly<{ year: number; month: number; delta: number; mine: boolean; assignee: string; event?: string }>): string {
  const shifted = new Date(Date.UTC(year, month + delta, 1))
  return calendarReturnTo({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    mine,
    assignee,
    layout: 'agenda',
    ...(event === undefined ? {} : { event }),
  })
}

const dateFormatter = (timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

type CalendarQuery = Readonly<{
  month?: string
  year?: string
  view?: string
  assignee?: string
  event?: string
  layout?: string
}>

function calendarLinks({
  year,
  month,
  mine,
  assignee,
  timeZone,
  event,
}: Readonly<{
  year: number
  month: number
  mine: boolean
  assignee: string
  timeZone: string
  event: string | undefined
}>) {
  const selectedEvent = event === undefined ? {} : { event }
  const layoutHrefs = {
    monthHref: calendarReturnTo({ year, month, mine, assignee, ...selectedEvent }),
    agendaHref: calendarReturnTo({ year, month, mine, assignee, layout: 'agenda', ...selectedEvent }),
  }
  const [todayYear, todayMonth] = dateFormatter(timeZone).format(Date.now()).split('-').map(Number)
  const agendaNavigation = {
    previousHref: shiftedHref({ year, month, delta: -1, mine, assignee, event }),
    nextHref: shiftedHref({ year, month, delta: 1, mine, assignee, event }),
    todayHref: calendarReturnTo({
      year: todayYear,
      month: todayMonth - 1,
      mine,
      assignee,
      layout: 'agenda',
      ...(event === undefined ? {} : { event }),
    }),
    monthHref: layoutHrefs.monthHref,
  }
  return { layoutHrefs, agendaNavigation }
}

async function prepareCalendarPage(query: CalendarQuery) {
  const requestedMine = query.view === 'mine'
  const layout: CalendarLayout = query.layout === 'agenda' ? 'agenda' : 'month'
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
  const returnTo = calendarReturnTo({ year, month, mine, assignee, layout })
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
    carriedQuery: carriedQuery({ mine, assignee, layout }),
  })
  const { layoutHrefs, agendaNavigation } = calendarLinks({
    year,
    month,
    mine,
    assignee,
    timeZone: model.timeZone,
    event: query.event,
  })
  return {
    model,
    people,
    events,
    copy,
    calendarCopy,
    assignee,
    mine,
    year,
    month,
    layout,
    layoutHrefs,
    agendaNavigation,
    selectedSchedule,
  }
}

/** Month calendar for scoped tasks and scheduled sales activity. */
export default async function CalendarPage({ searchParams }: Readonly<{ searchParams: Promise<CalendarQuery> }>) {
  const {
    model,
    people,
    events,
    copy,
    calendarCopy,
    assignee,
    mine,
    year,
    month,
    layout,
    layoutHrefs,
    agendaNavigation,
    selectedSchedule,
  } = await prepareCalendarPage(await searchParams)
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
              <CalendarLayoutToggle active={layout} {...layoutHrefs} copy={calendarCopy} />
            </>
          }
        />
        <CalendarSurface
          model={model}
          people={people}
          events={events}
          calendarCopy={calendarCopy}
          assignee={assignee}
          mine={mine}
          year={year}
          month={month}
          layout={layout}
          agendaNavigation={agendaNavigation}
          selectedSchedule={selectedSchedule}
        />
      </PageContent>
    </>
  )
}
