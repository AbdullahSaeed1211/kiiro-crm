'use client'

import { Button } from '@ops/ui/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@ops/ui/components/ui/sheet'
import { Bell, CheckCircle2 } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { NOTIFICATION_COPY, type Locale } from '../../i18n/config'
import { describeClientError } from './client-errors'
import { readApi } from './api-client'
import { notificationHref, presentNotification, type NotificationItem } from './notification-presentation'

/** How often the bell re-reads the unread count while the tab is visible. */
const UNREAD_POLL_MS = 60_000

/** The unread count, or null when it could not be read, so one failed check does not clear a real badge. */
async function loadUnreadCount(signal: AbortSignal): Promise<number | null> {
  try {
    const response = await fetch('/api/v1/notifications/unread-count', { credentials: 'same-origin', signal })
    const result = await readApi<{ count?: number }>(response, 'Could not count notifications.')
    return result.ok ? (result.data.count ?? 0) : null
  } catch {
    return null
  }
}

const MINUTE = ['minute', 60_000] as const
const UNITS: readonly (readonly [Intl.RelativeTimeFormatUnit, number])[] = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
]

/** "5 minutes ago" in the workspace language, or nothing when the time is missing or unreadable. */
function timeAgo(createdAt: string | undefined, locale: Locale): string {
  const then = createdAt === undefined ? Number.NaN : Date.parse(createdAt)
  if (Number.isNaN(then)) return ''
  const elapsed = then - Date.now()
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const [unit, size] = UNITS.find(([, ms]) => Math.abs(elapsed) >= ms) ?? MINUTE
  return formatter.format(Math.round(elapsed / size), unit)
}

const isUnread = (item: NotificationItem): boolean => typeof item.readAt !== 'number'

function NotificationsEmpty({
  loading,
  error,
  empty,
  label,
}: Readonly<{ loading: boolean; error: string | null; empty: boolean; label: string }>) {
  if (loading || error !== null || !empty) return null
  return (
    <div className="grid place-items-center gap-2 py-12 text-center text-sm text-muted-foreground">
      <CheckCircle2 className="size-6" aria-hidden />
      {label}
    </div>
  )
}

// eslint-disable-next-line max-lines-per-function -- the notification sheet keeps its fetch and read state together.
export function WorkspaceNotifications({ locale }: Readonly<{ locale: Locale }>) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(0)
  const [items, setItems] = useState<readonly NotificationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)
  const copy = NOTIFICATION_COPY[locale]

  useEffect(() => {
    const controller = new AbortController()
    const refresh = () => {
      if (document.visibilityState === 'hidden') return
      void loadUnreadCount(controller.signal).then((next) => {
        if (!controller.signal.aborted && next !== null) setCount(next)
      })
    }
    refresh()
    const timer = window.setInterval(refresh, UNREAD_POLL_MS)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      controller.abort()
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    void fetch('/api/v1/notifications', { credentials: 'same-origin', signal: controller.signal })
      .then((response) => readApi<{ records?: readonly NotificationItem[] }>(response, copy.loadFailed))
      .then((result) => {
        if (controller.signal.aborted) return
        if (result.ok) setItems(result.data.records ?? [])
        else setError(copy.loadFailed)
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(copy.loadFailed)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => {
      controller.abort()
    }
  }, [open, copy.loadFailed])

  const unread = items.filter(isUnread)
  const markAllRead = async () => {
    setMarkingAll(true)
    const results = await Promise.all(
      unread.map((item) =>
        fetch(`/api/v1/notifications/${item.id}`, { method: 'PATCH' })
          .then((response) => (response.ok ? item.id : null))
          .catch(() => null),
      ),
    )
    const done = new Set(results.filter((id): id is string => id !== null))
    setItems((current) => current.map((entry) => (done.has(entry.id) ? { ...entry, readAt: Date.now() } : entry)))
    setCount((current) => Math.max(0, current - done.size))
    setError(done.size === unread.length ? null : copy.readFailed)
    setMarkingAll(false)
  }

  const select = async (item: NotificationItem) => {
    if (isUnread(item)) {
      let markedRead = false
      try {
        const response = await fetch(`/api/v1/notifications/${item.id}`, { method: 'PATCH' })
        if (!response.ok) throw new Error('notification read update failed')
        markedRead = true
      } catch (error) {
        setError(describeClientError(error, { context: 'notification read', fallback: copy.readFailed, locale }))
      }
      if (markedRead) {
        setCount((current) => Math.max(0, current - 1))
        setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, readAt: Date.now() } : entry)))
      }
    }
    setError(null)
    const href = notificationHref(item, pathname, window.location.search)
    if (href !== undefined) {
      setOpen(false)
      router.push(href)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon-sm" className="relative" aria-label={copy.label} />}>
        <Bell aria-hidden />
        {count > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-4 rounded-full bg-primary px-1 text-[10px] leading-4 text-primary-foreground">
            {Math.min(count, 99)}
          </span>
        ) : null}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{copy.label}</SheetTitle>
          <SheetDescription>{copy.description}</SheetDescription>
        </SheetHeader>
        {error === null ? null : (
          <p className="px-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {unread.length === 0 ? null : (
          <div className="px-4">
            <Button
              variant="outline"
              size="sm"
              disabled={markingAll}
              onClick={() => {
                void markAllRead()
              }}
            >
              {markingAll ? copy.markingAll : copy.markAllRead}
            </Button>
          </div>
        )}
        <div className="space-y-2 overflow-y-auto px-4 pb-6">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground" aria-live="polite">
              {copy.loading}
            </p>
          ) : null}
          <NotificationsEmpty loading={loading} error={error} empty={items.length === 0} label={copy.caughtUp} />
          {items.map((item) => {
            const presentation = presentNotification(item, locale)
            return (
              <Button
                variant="ghost"
                type="button"
                className="h-auto w-full justify-start whitespace-normal rounded-lg border bg-card p-3 text-left"
                key={item.id}
                onClick={() => void select(item)}
              >
                <span className="flex items-start gap-2">
                  <span
                    className={`mt-1.5 size-1.5 shrink-0 rounded-full ${isUnread(item) ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-muted-foreground">{presentation.kind}</span>
                    <span className="mt-0.5 block text-sm font-medium">{presentation.title}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {[presentation.scheduledAt, timeAgo(item.createdAt, locale)].filter(Boolean).join(' · ')}
                    </span>
                    {presentation.action === undefined ? null : (
                      <span className="mt-2 block text-xs font-medium text-primary">{presentation.action} →</span>
                    )}
                  </span>
                </span>
              </Button>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}
