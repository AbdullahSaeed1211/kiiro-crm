import { CalendarMonth, type CalendarEvent } from '@ops/ui/composites/CalendarMonth'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import type { Metadata } from 'next'
import { TASK_COPY } from '../../../i18n/config'
import { loadCalendarReadModel } from '../../../server/queries/work/calendar-read-model'
import { taskHref } from '../task-navigation'
import { TaskWorkspaceViews } from '../tasks/TaskWorkspaceViews'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Calendar' }

function dateInZone(value: number, formatter: Intl.DateTimeFormat): string {
  const parts = formatter.formatToParts(value)
  const get = (name: string) => parts.find((part) => part.type === name)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}`
}
function eventTone(priority: string): CalendarEvent['tone'] {
  if (priority === 'urgent') return 'red'
  if (priority === 'high') return 'amber'
  return 'blue'
}

/** Month calendar for scoped tasks, grouped by due date. */
export default async function CalendarPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ readonly month?: string; readonly year?: string }> }>) {
  const query = await searchParams
  const model = await loadCalendarReadModel(query.year, query.month)
  const year = model.calendarYear
  const month = model.calendarMonth
  const copy = TASK_COPY[model.locale]
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: model.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const monthPrefix = `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-`
  const events: CalendarEvent[] = model.tasks
    .filter(
      (task): task is typeof task & { readonly dueAt: number } =>
        task.dueAt !== null && !['done_success', 'done_failure', 'cancelled'].includes(task.stageCategory),
    )
    .map((task) => ({
      id: task.id,
      title: task.title,
      date: dateInZone(task.dueAt, formatter),
      href: taskHref(task.id, '/calendar'),
      tone: eventTone(task.priority),
    }))
    .filter((event) => event.date.startsWith(monthPrefix))
  return (
    <>
      <AppHeader breadcrumbs={[{ label: copy.calendar }]} />
      <PageContent>
        <PageHeader
          title={copy.calendar}
          description={copy.calendarDescription}
          actions={<TaskWorkspaceViews active="calendar" locale={model.locale} />}
        />
        <CalendarMonth
          year={year}
          month={month}
          weekStartsOn={model.weekStartsOn}
          locale={model.locale}
          labels={{ previous: copy.previousMonth, next: copy.nextMonth }}
          events={events}
        />
      </PageContent>
    </>
  )
}
