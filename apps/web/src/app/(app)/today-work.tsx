import { Clock3 } from 'lucide-react'
import { DAY_MS } from '@ops/module-work'
import Link from 'next/link'
import { buttonVariants } from '@ops/ui/components/ui/button'
import { DASHBOARD_TODAY_COPY } from '../../i18n/dashboard-today-copy'
import type { DashboardTask, DashboardWork } from '../../server/queries/work/dashboard-work'
import { TodayItem } from './today-queue'
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

function overdueHref(work: DashboardWork): string {
  if (!work.team) return '/tasks?view=open&due=overdue&assignee=me'
  if (work.personFilter === 'everyone') return '/tasks?view=open&due=overdue'
  const assignee = work.personFilter === 'unassigned' ? 'none' : work.personFilter
  return `/tasks?view=open&due=overdue&assignee=${encodeURIComponent(assignee)}`
}

/** A quiet overdue summary that expands to a bounded, actionable preview. */
export function TodayOverdueDisclosure({ work }: Readonly<{ work: DashboardWork }>) {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  if (work.overdue.count === 0) return null
  return (
    <section className="min-w-0 rounded-xl border bg-card" aria-label={copy.overdue}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
        <details className="min-w-0 flex-1">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold">
            <Clock3 aria-hidden className="size-4 text-muted-foreground" />
            {copy.overdue}
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
              {work.overdue.count}
            </span>
          </summary>
          <ul className="mt-2 -mx-3 divide-y border-t">
            {work.overdue.items.map((task) => (
              <TodayItem
                key={task.id}
                title={task.title}
                detail={[task.context ?? copy.internal, task.people.join(', ') || copy.unassigned].join(' · ')}
                when={dueLabel(task, work)}
                overdue
                href={taskHref(String(task.id), '/')}
                action={copy.openTask}
                taskId={String(task.id)}
                compact
                accessory={
                  !work.team && task.assigneeIds.includes(work.actorId) ? (
                    <TaskCompleteButton taskId={String(task.id)} title={task.title} updatedAt={task.updatedAt} />
                  ) : null
                }
              />
            ))}
          </ul>
        </details>
        <Link
          href={overdueHref(work)}
          className="shrink-0 text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          {copy.viewAll}
        </Link>
      </div>
    </section>
  )
}
