'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Check } from 'lucide-react'
import { useState } from 'react'
import { DASHBOARD_TODAY_COPY } from '../../i18n/dashboard-today-copy'
import type { DashboardPlanItem, DashboardWork } from '../../server/queries/work/dashboard-work'
import { TodayItem } from './today-queue'
import { taskHref } from './task-navigation'
import { DueTodayDisclosure } from './today-due-today'
import { UpcomingDisclosure } from './today-upcoming'
import { CurrentFocusButton } from './current-focus-button'
import { TodayCloseoutMenu } from './today-closeout-menu'
import { ExistingTaskDialog, whenLabel } from './today-existing-task-dialog'

const PLAN_PREVIEW = 5
function planDetail(item: DashboardPlanItem, work: DashboardWork): string {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  return [
    work.team ? item.personName : '',
    item.task.context ?? copy.internal,
    item.task.people.join(', ') || (item.task.assigneeIds.length === 0 ? copy.unassigned : ''),
  ]
    .filter(Boolean)
    .join(' · ')
}

function planAccessory(item: DashboardPlanItem, work: DashboardWork) {
  return (
    <>
      {focusControl(item, work)}
      {closeoutControl(item, work)}
      {completedMark(item, work)}
    </>
  )
}

function focusControl(item: DashboardPlanItem, work: DashboardWork) {
  if (work.team || item.userId !== work.actorId || item.task.isFinished) return null
  const current = work.currentFocus.find((focus) => focus.userId === work.actorId)
  return (
    <CurrentFocusButton taskId={String(item.task.id)} active={current?.task.id === item.task.id} locale={work.locale} />
  )
}

function closeoutControl(item: DashboardPlanItem, work: DashboardWork) {
  if (work.team || item.userId !== work.actorId) return null
  return (
    <TodayCloseoutMenu
      task={item.task}
      work={work}
      canCloseout={!item.task.isFinished && item.task.assigneeIds.includes(work.actorId)}
    />
  )
}

function completedMark(item: DashboardPlanItem, work: DashboardWork) {
  return item.task.isFinished ? (
    <Check aria-label={DASHBOARD_TODAY_COPY[work.locale].completedTasks} className="size-4 text-muted-foreground" />
  ) : null
}

function PlanRow({ item, work }: Readonly<{ item: DashboardPlanItem; work: DashboardWork }>) {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  return (
    <TodayItem
      title={item.task.title}
      titleHref={taskHref(String(item.task.id), '/')}
      detail={planDetail(item, work)}
      when={whenLabel(item.task, work)}
      overdue={item.task.dueAt !== null && item.task.dueAt < work.dayStart}
      taskId={String(item.task.id)}
      accessory={planAccessory(item, work)}
      badge={
        item.task.blockedReason ? (
          <span
            className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300"
            title={item.task.blockedReason}
          >
            {copy.blockedBadge}
          </span>
        ) : null
      }
      compact
    />
  )
}

/** Explicit personal intent sits beside due-today work without changing deadlines. */
export function TodayPlan({ work }: Readonly<{ work: DashboardWork }>) {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  const [showAll, setShowAll] = useState(false)
  const planned = work.plan.items.filter((item) => !item.task.isFinished)
  const completed = work.plan.items.filter((item) => item.task.isFinished)
  const visible = showAll ? planned : planned.slice(0, PLAN_PREVIEW)
  return (
    <section className="min-w-0 rounded-xl border bg-card" aria-label={copy.myPlanToday}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-3 py-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          {copy.myPlanToday}
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {work.plan.count}
          </span>
        </h2>
        {!work.team ? <ExistingTaskDialog work={work} /> : null}
      </div>
      {visible.length > 0 ? (
        <ul className="divide-y">
          {visible.map((item) => (
            <PlanRow key={`${item.userId}:${item.task.id}`} item={item} work={work} />
          ))}
        </ul>
      ) : (
        <p className="px-3 py-3 text-sm text-muted-foreground">{copy.noPlannedTasks}</p>
      )}
      {planned.length > PLAN_PREVIEW ? (
        <div className="border-t px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowAll((value) => !value)
            }}
          >
            {showAll ? copy.showLess : copy.showMore}
          </Button>
        </div>
      ) : null}
      {completed.length > 0 ? (
        <details className="border-t px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium">
            {copy.completedTasks} <span className="text-muted-foreground">{completed.length}</span>
          </summary>
          <ul className="mt-2 divide-y rounded-md border">
            {completed.map((item) => (
              <PlanRow key={`${item.userId}:${item.task.id}`} item={item} work={work} />
            ))}
          </ul>
        </details>
      ) : null}
      <DueTodayDisclosure work={work} />
      <UpcomingDisclosure work={work} />
    </section>
  )
}
