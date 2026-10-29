'use client'

import Link from 'next/link'
import { DASHBOARD_TODAY_COPY } from '../../i18n/dashboard-today-copy'
import type { DashboardTask, DashboardWork } from '../../server/queries/work/dashboard-work'
import { TodayItem } from './today-queue'
import { taskHref } from './task-navigation'
import { TaskCompleteButton } from './my-tasks/TaskCompleteButton'

function dueDetail(task: DashboardTask, work: DashboardWork): string {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  return [task.context ?? copy.internal, task.people.join(', ') || copy.unassigned].join(' · ')
}

function dueTodayHref(work: DashboardWork): string {
  if (!work.team) return '/tasks?view=open&due=today&assignee=me'
  if (work.personFilter === 'everyone') return '/tasks?view=open&due=today'
  const assignee = work.personFilter === 'unassigned' ? 'none' : work.personFilter
  return `/tasks?view=open&due=today&assignee=${encodeURIComponent(assignee)}`
}

export function DueTodayDisclosure({ work }: Readonly<{ work: DashboardWork }>) {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  if (work.dueToday.count === 0) return null
  const plannedIds = new Set(work.plan.items.map((item) => String(item.task.id)))
  const dueTodayItems = work.dueToday.items.filter((task) => !plannedIds.has(String(task.id)))
  const hasMore = work.dueToday.count > work.dueToday.items.length
  return (
    <details className="border-t px-3 py-2">
      <summary className="cursor-pointer text-sm font-medium">
        {copy.dueTodayTasks} <span className="text-muted-foreground">{work.dueToday.count}</span>
      </summary>
      <p className="py-2 text-xs text-muted-foreground">{copy.unplannedDue}</p>
      <ul className="divide-y rounded-md border">
        {dueTodayItems.map((task) => (
          <TodayItem
            key={task.id}
            title={task.title}
            detail={dueDetail(task, work)}
            when={copy.dueToday}
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
      {hasMore ? (
        <Link href={dueTodayHref(work)} className="mt-2 inline-block text-xs underline">
          {copy.viewAll}
        </Link>
      ) : null}
    </details>
  )
}
