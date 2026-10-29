'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@ops/ui/components/ui/dialog'
import { Check, Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { DAY_MS } from '@ops/module-work'
import { DASHBOARD_TODAY_COPY } from '../../i18n/dashboard-today-copy'
import type { DashboardPlanItem, DashboardTask, DashboardWork } from '../../server/queries/work/dashboard-work'
import { addTaskToPlan, removeTaskFromPlan } from '../../server/actions/work/tasks/taskDayPlan'
import { TodayItem } from './today-queue'
import { taskHref } from './task-navigation'
import { TaskCompleteButton } from './my-tasks/TaskCompleteButton'
import { DueTodayDisclosure } from './today-due-today'
import { CandidateList, TaskSearchField } from './today-plan-dialog-parts'

const PLAN_PREVIEW = 5
const CANDIDATE_PREVIEW = 5

function whenLabel(task: DashboardTask, work: DashboardWork): string {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  if (task.dueAt === null) return copy.noDate
  if (task.dueAt < work.dayStart) return copy.overdue
  if (task.dueAt < work.dayStart + DAY_MS) return copy.dueToday
  const date = new Intl.DateTimeFormat(work.locale, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    task.dueAt,
  )
  return copy.due.replace('{date}', date)
}

function planDetail(item: DashboardPlanItem, work: DashboardWork): string {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  return [
    work.team ? item.personName : '',
    item.task.context ?? copy.internal,
    item.task.people.join(', ') || copy.unassigned,
  ]
    .filter(Boolean)
    .join(' · ')
}

function PlanRow({ item, work }: Readonly<{ item: DashboardPlanItem; work: DashboardWork }>) {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  const mayComplete = !work.team && item.task.assigneeIds.includes(work.actorId) && !item.task.isFinished
  const mayRemove = !work.team && item.userId === work.actorId
  const accessory = (
    <>
      {mayComplete ? (
        <TaskCompleteButton taskId={String(item.task.id)} title={item.task.title} updatedAt={item.task.updatedAt} />
      ) : null}
      {mayRemove ? <RemovePlanButton item={item} work={work} /> : null}
      {item.task.isFinished ? (
        <Check aria-label={copy.completedTasks} className="size-4 text-muted-foreground" />
      ) : null}
    </>
  )
  return (
    <TodayItem
      title={item.task.title}
      detail={planDetail(item, work)}
      when={whenLabel(item.task, work)}
      overdue={item.task.dueAt !== null && item.task.dueAt < work.dayStart}
      href={taskHref(String(item.task.id), '/')}
      action={copy.openTask}
      taskId={String(item.task.id)}
      accessory={accessory}
      compact
    />
  )
}

function RemovePlanButton({ item, work }: Readonly<{ item: DashboardPlanItem; work: DashboardWork }>) {
  const router = useRouter()
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  async function remove() {
    if (pending) return
    setPending(true)
    setFailed(false)
    try {
      const result = await removeTaskFromPlan(String(item.task.id))
      if (result.ok) router.refresh()
      else setFailed(true)
    } catch {
      setFailed(true)
    } finally {
      setPending(false)
    }
  }
  return (
    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      disabled={pending}
      onClick={() => void remove()}
      aria-label={copy.removeFromPlan}
      title={failed ? copy.planFailed : copy.removeFromPlan}
    >
      <X aria-hidden className="size-4" />
    </Button>
  )
}

function ExistingTaskDialog({ work }: Readonly<{ work: DashboardWork }>) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const router = useRouter()
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  const plannedIds = useMemo(() => new Set(work.plan.items.map((item) => String(item.task.id))), [work.plan.items])
  const candidates = useMemo(() => {
    const value = search.trim().toLocaleLowerCase(work.locale)
    return work.planCandidates.items
      .filter((task) => !plannedIds.has(String(task.id)))
      .filter((task) => value === '' || task.title.toLocaleLowerCase(work.locale).includes(value))
      .slice(0, CANDIDATE_PREVIEW)
  }, [plannedIds, search, work.locale, work.planCandidates.items])

  async function add(taskId: string) {
    if (pendingId !== null) return
    setPendingId(taskId)
    setFailed(false)
    try {
      const result = await addTaskToPlan(taskId)
      if (result.ok) {
        setSearch('')
        setOpen(false)
        router.refresh()
      } else setFailed(true)
    } catch {
      setFailed(true)
    } finally {
      setPendingId(null)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          setOpen(true)
        }}
      >
        <Plus aria-hidden className="size-4" />
        {copy.addExistingTask}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.addExistingTask}</DialogTitle>
            <DialogDescription>{copy.planHint}</DialogDescription>
          </DialogHeader>
          <TaskSearchField value={search} onChange={setSearch} work={work} />
          <CandidateList
            candidates={candidates}
            pendingId={pendingId}
            add={(taskId) => {
              void add(taskId)
            }}
            work={work}
            when={(task) => whenLabel(task, work)}
          />
          {work.planCandidates.count > CANDIDATE_PREVIEW ? (
            <p className="text-xs text-muted-foreground">{copy.candidateHint}</p>
          ) : null}
          {failed ? (
            <p role="alert" className="text-sm text-destructive">
              {copy.planFailed}
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
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
    </section>
  )
}
