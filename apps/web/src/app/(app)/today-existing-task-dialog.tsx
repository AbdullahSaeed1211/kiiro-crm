'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@ops/ui/components/ui/dialog'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { DAY_MS } from '@ops/module-work'
import { DASHBOARD_TODAY_COPY } from '../../i18n/dashboard-today-copy'
import type { DashboardTask, DashboardWork } from '../../server/queries/work/dashboard-work'
import { addTaskToPlan } from '../../server/actions/work/tasks/taskDayPlan'
import { CandidateList, TaskSearchField } from './today-plan-dialog-parts'

const CANDIDATE_PREVIEW = 5

export function whenLabel(task: DashboardTask, work: DashboardWork): string {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  if (task.dueAt === null) return copy.noDate
  if (task.dueAt < work.dayStart) return copy.overdue
  if (task.dueAt < work.dayStart + DAY_MS) return copy.dueToday
  const date = new Intl.DateTimeFormat(work.locale, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    task.dueAt,
  )
  return copy.due.replace('{date}', date)
}

export function ExistingTaskDialog({ work }: Readonly<{ work: DashboardWork }>) {
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
