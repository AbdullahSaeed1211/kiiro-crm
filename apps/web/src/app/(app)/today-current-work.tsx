'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Play, RefreshCw, Square } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { DASHBOARD_TODAY_COPY } from '../../i18n/dashboard-today-copy'
import type { DashboardCurrentFocus, DashboardWork } from '../../server/queries/work/dashboard-work'
import { updateCurrentFocus } from '../../server/actions/work/tasks/currentFocus'
import { taskHref } from './task-navigation'

function timeLabel(value: number, work: DashboardWork): string {
  return new Intl.DateTimeFormat(work.locale, { hour: 'numeric', minute: '2-digit', timeZone: work.timeZone }).format(
    value,
  )
}

export function CurrentFocusButton({
  taskId,
  active,
  locale,
}: Readonly<{ taskId: string; active: boolean; locale: DashboardWork['locale'] }>) {
  const router = useRouter()
  const copy = DASHBOARD_TODAY_COPY[locale]
  const label = active ? copy.stopWorking : copy.startWorking
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const description = failed ? copy.focusFailed : label
  async function update() {
    if (pending) return
    setPending(true)
    setFailed(false)
    try {
      const result = await updateCurrentFocus(active ? { action: 'stop' } : { action: 'start', taskId })
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
      size="sm"
      variant={active ? 'secondary' : 'ghost'}
      disabled={pending}
      onClick={() => void update()}
      aria-label={description}
      title={description}
    >
      {active ? <Square aria-hidden className="size-3.5 fill-current" /> : <Play aria-hidden className="size-4" />}
      {label}
    </Button>
  )
}

function FocusRow({ item, work }: Readonly<{ item: DashboardCurrentFocus; work: DashboardWork }>) {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  const isSelf = item.userId === work.actorId
  return (
    <li className="flex min-w-0 items-center gap-3 px-3 py-2.5 sm:px-4">
      <span
        aria-hidden
        className={`size-2 shrink-0 rounded-full ${item.stale ? 'bg-muted-foreground/50' : 'bg-emerald-500'}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {work.canSeeTeam ? (
            <span className="text-xs font-medium text-muted-foreground">{item.personName || copy.mine}</span>
          ) : null}
          {item.stale ? <span className="text-[11px] text-muted-foreground">{copy.previousFocus}</span> : null}
          <Link
            href={taskHref(String(item.task.id), '/')}
            className="truncate text-sm font-medium underline-offset-4 hover:underline"
          >
            {item.task.title}
          </Link>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {copy.startedAt} {timeLabel(item.startedAt, work)}
        </p>
      </div>
      {isSelf ? <CurrentFocusButton taskId={String(item.task.id)} active locale={work.locale} /> : null}
    </li>
  )
}

export function TodayCurrentWork({ work }: Readonly<{ work: DashboardWork }>) {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  const router = useRouter()
  const rows = work.currentFocus
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border bg-card" aria-label={copy.currentWork}>
      <div className="flex items-center justify-between gap-3 border-b px-3 py-2.5 sm:px-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <span aria-hidden className="size-2 rounded-full bg-emerald-500" />
          {copy.currentWork}
          {rows.length ? (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
              {rows.filter((row) => !row.stale).length}
            </span>
          ) : null}
        </h2>
        <div className="flex items-center gap-2">
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            {copy.updatedAtLabel} {timeLabel(work.refreshedAt, work)}
          </span>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={() => {
              router.refresh()
            }}
            aria-label={copy.refreshCurrentWork}
            title={copy.refreshCurrentWork}
          >
            <RefreshCw aria-hidden className="size-4" />
          </Button>
        </div>
      </div>
      {rows.length ? (
        <ul className="divide-y">
          {rows.map((item) => (
            <FocusRow key={item.userId} item={item} work={work} />
          ))}
        </ul>
      ) : (
        <p className="px-3 py-3 text-sm text-muted-foreground sm:px-4">{copy.currentWorkEmpty}</p>
      )}
    </section>
  )
}
