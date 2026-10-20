import { CalendarDays, Clock3 } from 'lucide-react'
import { DASHBOARD_TODAY_COPY } from '../../i18n/dashboard-today-copy'
import type { DashboardTask, DashboardWork } from '../../server/queries/work/dashboard-work'
import { TodayItem, TodayQueue } from './today-queue'
import { taskHref } from './task-navigation'

function dueLabel(task: DashboardTask, work: DashboardWork): string {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  if (task.dueAt === null) return copy.noDate
  if (task.dueAt === work.dayStart) return copy.dueToday
  const date = new Intl.DateTimeFormat(work.locale, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    task.dueAt,
  )
  return copy.due.replace('{date}', date)
}

/** The same concise task row for overdue and upcoming queues, including the project and responsible people. */
export function TodayTaskQueue({ work, kind }: Readonly<{ work: DashboardWork; kind: 'overdue' | 'dueWeek' }>) {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  const overdue = kind === 'overdue'
  const section = work[kind]
  return (
    <TodayQueue
      title={overdue ? copy.overdue : copy.week}
      count={section.count}
      icon={overdue ? Clock3 : CalendarDays}
      href={`/tasks?view=open&due=${overdue ? 'overdue' : 'week'}${work.team ? '' : '&assignee=me'}`}
      viewAll={copy.viewAll}
      empty={overdue ? copy.noOverdue : copy.noWeek}
    >
      {section.items.map((task) => (
        <TodayItem
          key={task.id}
          title={task.title}
          detail={[task.context ?? copy.internal, task.people.join(', ') || copy.unassigned].join(' · ')}
          when={dueLabel(task, work)}
          overdue={overdue}
          href={taskHref(task.id, '/')}
          action={copy.openTask}
          taskId={task.id}
        />
      ))}
    </TodayQueue>
  )
}
