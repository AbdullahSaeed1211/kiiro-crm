import type { CalendarEvent } from '@ops/ui/composites/CalendarMonth'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import type { Metadata } from 'next'
import { formatDateISO } from '@ops/ui/lib/dates'
import { TASK_COPY } from '../../../i18n/config'
import { CALENDAR_COPY } from '../../../i18n/calendar-copy'
import { catalogFor } from '../../../i18n/locale'
import { loadCalendarReadModel } from '../../../server/queries/work/calendar-read-model'
import { loadTaskPeople } from '../../../server/queries/work/task-details'
import { AssigneeFilter } from '../tasks/AssigneeFilter'
import { assigneeOptions, validAssignee } from '../tasks/assignee-options'
import { taskHref } from '../task-navigation'
import { moveTaskOnCalendar } from './move-task'
import { TaskWorkspaceViews } from '../tasks/TaskWorkspaceViews'
import { CalendarWorkspace } from './calendar-workspace'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Calendar' }
function eventColor(priority: string): CalendarEvent['color'] {
  if (priority === 'urgent') return 'red'
  if (priority === 'high') return 'amber'
  return 'blue'
}

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
const dueFormatter = dateFormatter('UTC')

/** Month calendar for scoped tasks, grouped by due date. */
export default async function CalendarPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{
    readonly month?: string
    readonly year?: string
    readonly view?: string
    readonly assignee?: string
  }>
}>) {
  const query = await searchParams
  const mine = query.view === 'mine'
  const people = await loadTaskPeople()
  const assignee = validAssignee(query.assignee, people)
  const model = await loadCalendarReadModel({ year: query.year, month: query.month, mine, assignee })
  const year = model.calendarYear
  const month = model.calendarMonth
  const copy = TASK_COPY[model.locale]
  const formatter = dateFormatter(model.timeZone)
  const monthPrefix = `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-`
  const returnTo = calendarReturnTo({ year, month, mine, assignee })
  const events: CalendarEvent[] = model.tasks
    .filter(
      (task): task is typeof task & { readonly dueAt: number } =>
        task.dueAt !== null && !['done_success', 'done_failure', 'cancelled'].includes(task.stageCategory),
    )
    .map((task) => ({
      id: task.id,
      title: task.title,
      date: formatDateISO(task.dueAt, dueFormatter),
      href: taskHref(task.id, returnTo),
      color: eventColor(task.priority),
      moveToken: JSON.stringify({ dueAt: task.dueAt, startAt: task.startAt, updatedAt: task.updatedAt }),
    }))
    .filter((event) => event.date.startsWith(monthPrefix))
  return (
    <>
      <AppHeader breadcrumbs={[{ label: copy.calendar }]} />
      <PageContent>
        <PageHeader
          title={copy.calendar}
          description={copy.calendarDescription}
          actions={
            <>
              <AssigneeFilter
                value={assignee}
                label={copy.assignee}
                allLabel={copy.anyAssignee}
                options={assigneeOptions(people)}
              />
              <TaskWorkspaceViews active="calendar" locale={model.locale} mine={mine} />
            </>
          }
        />
        {model.capped ? (
          <p role="status" className="text-sm text-muted-foreground">
            {catalogFor(CALENDAR_COPY, model.locale).capped.replace('{count}', String(events.length))}
          </p>
        ) : null}
        <CalendarWorkspace
          people={Array.from(people, ([id, name]) => ({ id, name }))}
          initialAssignee={assignee || model.actorId}
          copy={catalogFor(CALENDAR_COPY, model.locale)}
          calendar={{
            year,
            month,
            weekStartsOn: model.weekStartsOn,
            locale: model.locale,
            labels: { previous: copy.previousMonth, next: copy.nextMonth, more: copy.calendarMore, today: copy.today },
            events,
            today: formatter.format(Date.now()),
            onMove: moveTaskOnCalendar,
            query: carriedQuery({ mine, assignee }),
          }}
        />
      </PageContent>
    </>
  )
}
