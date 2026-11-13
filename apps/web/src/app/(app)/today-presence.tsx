'use client'

import { Activity } from 'lucide-react'
import { RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@ops/ui/components/ui/button'
import { DASHBOARD_TODAY_COPY } from '../../i18n/dashboard-today-copy'
import type { DashboardWork } from '../../server/queries/work/dashboard-work'

/** Recent app interaction, independent of attendance and explicit current-task focus. */
export function TodayPresence({ work }: Readonly<{ work: DashboardWork }>) {
  const router = useRouter()
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  const [now, setNow] = useState(work.refreshedAt)
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, 20_000)
    return () => {
      window.clearInterval(timer)
    }
  }, [])
  const visible = work.presence.filter((person) => now - person.lastSeenAt <= 15 * 60_000)
  const active = visible.filter((person) => now - person.lastSeenAt <= 2 * 60_000)
  const recent = visible.filter((person) => now - person.lastSeenAt > 2 * 60_000)
  return (
    <section className="min-w-0 rounded-xl border bg-card px-3 py-3 sm:px-4" aria-label={copy.teamPresence}>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Activity aria-hidden className="size-4 text-muted-foreground" />
          {copy.teamPresence}
        </h2>
        <span className="text-[11px] text-muted-foreground">{copy.presenceWindow}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            {copy.updatedAtLabel}{' '}
            {new Intl.DateTimeFormat(work.locale, {
              hour: 'numeric',
              minute: '2-digit',
              timeZone: work.timeZone,
            }).format(work.refreshedAt)}
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
      {visible.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{copy.noRecentActivity}</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs">
          {active.length ? (
            <p className="flex min-w-0 items-center gap-2">
              <span aria-hidden className="size-2 shrink-0 rounded-full bg-emerald-500" />
              <span className="font-medium">{copy.activeNow}:</span>
              <span className="truncate text-muted-foreground">
                {active.map((person) => person.personName).join(', ')}
              </span>
            </p>
          ) : null}
          {recent.length ? (
            <p className="flex min-w-0 items-center gap-2">
              <span aria-hidden className="size-2 shrink-0 rounded-full bg-muted-foreground/50" />
              <span className="font-medium">{copy.recentlyActive}:</span>
              <span className="truncate text-muted-foreground">
                {recent.map((person) => person.personName).join(', ')}
              </span>
            </p>
          ) : null}
        </div>
      )}
    </section>
  )
}
