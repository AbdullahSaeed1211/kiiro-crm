import { CalendarDays, Clock3, Sun } from 'lucide-react'
import { DAY_MS } from '@ops/module-work'
import Link from 'next/link'
import { buttonVariants } from '@ops/ui/components/ui/button'
import { DASHBOARD_TODAY_COPY } from '../../i18n/dashboard-today-copy'
import type { DashboardTask, DashboardWork } from '../../server/queries/work/dashboard-work'
import { TodayItem, TodayQueue } from './today-queue'
import { taskHref } from './task-navigation'
import { TaskCompleteButton } from './my-tasks/TaskCompleteButton'

function dueLabel(task: DashboardTask, work: DashboardWork): string {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  if (task.dueAt === null) return copy.noDate
  if (task.dueAt >= work.dayStart && task.dueAt < work.dayStart + DAY_MS) return copy.dueToday
  const date = new Intl.DateTimeFormat(work.locale, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    task.dueAt,
  )
  return copy.due.replace('{date}', date)
}

export function TodayScopeSwitch({ work }: Readonly<{ work: DashboardWork }>) {
  if (!work.canSeeTeam) return null
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  return (
    <nav aria-label={copy.scopeLabel} className="flex flex-wrap items-center gap-2">
      <Link
        href="/?scope=mine"
        aria-current={work.team ? undefined : 'page'}
        className={buttonVariants({ variant: work.team ? 'ghost' : 'secondary', size: 'sm' })}
      >
        {copy.mine}
      </Link>
      <Link
        href="/?scope=team"
        aria-current={work.team ? 'page' : undefined}
        className={buttonVariants({ variant: work.team ? 'secondary' : 'ghost', size: 'sm' })}
      >
        {copy.team}
      </Link>
    </nav>
  )
}

function taskAssigneeFilter(work: DashboardWork): string {
  if (!work.team) return '&assignee=me'
  if (work.personFilter === 'everyone') return ''
  const person = work.personFilter === 'unassigned' ? 'none' : work.personFilter
  return `&assignee=${encodeURIComponent(person)}`
}

/** The same concise task row for overdue and upcoming queues, including the project and responsible people. */
export function TodayTaskQueue({
  work,
  kind,
}: Readonly<{ work: DashboardWork; kind: 'overdue' | 'dueToday' | 'dueWeek' }>) {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  const overdue = kind === 'overdue'
  const section = work[kind]
  const title = { overdue: copy.overdue, dueToday: copy.dueToday, dueWeek: copy.laterWeek }[kind]
  const filter = { overdue: 'overdue', dueToday: 'today', dueWeek: 'later-week' }[kind]
  const empty = { overdue: copy.noOverdue, dueToday: copy.noToday, dueWeek: copy.noWeek }[kind]
  const icon = { overdue: Clock3, dueToday: Sun, dueWeek: CalendarDays }[kind]
  const assigneeFilter = taskAssigneeFilter(work)
  return (
    <TodayQueue
      title={title}
      count={section.count}
      icon={icon}
      href={`/tasks?view=open&due=${filter}${assigneeFilter}`}
      viewAll={copy.viewAll}
      empty={empty}
      compact
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
          compact
          accessory={
            task.assigneeIds.includes(work.actorId) ? (
              <TaskCompleteButton taskId={task.id} title={task.title} updatedAt={task.updatedAt} />
            ) : null
          }
        />
      ))}
    </TodayQueue>
  )
}
