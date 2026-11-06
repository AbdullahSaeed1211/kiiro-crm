'use client'

import Link from 'next/link'
import { DASHBOARD_TODAY_COPY } from '../../i18n/dashboard-today-copy'
import type { DashboardTask, DashboardWork } from '../../server/queries/work/dashboard-work'
import { TodayItem } from './today-queue'
import { taskHref } from './task-navigation'

function dueDetail(task: DashboardTask, work: DashboardWork): string {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  return [task.context ?? copy.internal, task.people.join(', ') || copy.unassigned].join(' · ')
}

function dueLabel(task: DashboardTask, work: DashboardWork): string {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  if (task.dueAt === null) return copy.noDate
  const date = new Intl.DateTimeFormat(work.locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: work.timeZone,
  }).format(task.dueAt)
  return copy.due.replace('{date}', date)
}

function upcomingHref(work: DashboardWork): string {
  if (!work.team) return '/my-tasks'
  if (work.personFilter === 'everyone') return '/tasks?view=open'
  const assignee = work.personFilter === 'unassigned' ? 'none' : work.personFilter
  return `/tasks?view=open&assignee=${encodeURIComponent(assignee)}`
}

/** Open tasks due after today, so the next fortnight is visible without leaving Today. */
export function UpcomingDisclosure({ work }: Readonly<{ work: DashboardWork }>) {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  if (work.upcoming.count === 0) return null
  const hasMore = work.upcoming.count > work.upcoming.items.length
  return (
    <details className="border-t px-3 py-2">
      <summary className="cursor-pointer text-sm font-medium">
        {copy.upcomingTasks} <span className="text-muted-foreground">{work.upcoming.count}</span>
      </summary>
      <p className="py-2 text-xs text-muted-foreground">{copy.upcomingHint}</p>
      <ul className="divide-y rounded-md border">
        {work.upcoming.items.map((task) => (
          <TodayItem
            key={task.id}
            title={task.title}
            detail={dueDetail(task, work)}
            when={dueLabel(task, work)}
            href={taskHref(String(task.id), '/')}
            action={copy.openTask}
            taskId={String(task.id)}
            compact
          />
        ))}
      </ul>
      {hasMore ? (
        <Link href={upcomingHref(work)} className="mt-2 inline-block text-xs underline">
          {copy.viewAll}
        </Link>
      ) : null}
    </details>
  )
}
