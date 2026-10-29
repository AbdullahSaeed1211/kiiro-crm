'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Search } from 'lucide-react'
import { DASHBOARD_TODAY_COPY } from '../../i18n/dashboard-today-copy'
import type { DashboardTask, DashboardWork } from '../../server/queries/work/dashboard-work'

export function TaskSearchField({
  value,
  onChange,
  work,
}: Readonly<{ value: string; onChange: (value: string) => void; work: DashboardWork }>) {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  return (
    <label className="grid gap-2 text-sm font-medium">
      {copy.searchTasks}
      <span className="relative">
        <Search aria-hidden className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={value}
          onChange={(event) => {
            onChange(event.target.value)
          }}
          className="min-h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm font-normal"
        />
      </span>
    </label>
  )
}

export function CandidateList({
  candidates,
  pendingId,
  add,
  work,
  when,
}: Readonly<{
  candidates: readonly DashboardTask[]
  pendingId: string | null
  add: (taskId: string) => void
  work: DashboardWork
  when: (task: DashboardTask) => string
}>) {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  if (candidates.length === 0) return <p className="text-sm text-muted-foreground">{copy.noAvailableTasks}</p>
  return (
    <ul className="divide-y rounded-md border">
      {candidates.map((task) => (
        <li key={task.id} className="flex items-center gap-3 px-3 py-2">
          <span className="min-w-0 flex-1">
            <span className="block break-words text-sm font-medium">{task.title}</span>
            <span className="block text-xs text-muted-foreground">{when(task)}</span>
          </span>
          <Button
            type="button"
            size="sm"
            disabled={pendingId !== null}
            onClick={() => {
              add(String(task.id))
            }}
          >
            {pendingId === String(task.id) ? copy.addingTask : copy.addTask}
          </Button>
        </li>
      ))}
    </ul>
  )
}
