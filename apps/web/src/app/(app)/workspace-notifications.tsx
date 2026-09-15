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
import { taskHref } from './task-navigation'
import { NOTIFICATION_COPY, SHELL_COPY, type Locale } from '../../i18n/config'

interface NotificationItem {
  readonly id: string
  readonly type?: string
  readonly recordType?: string
  readonly recordId?: string
  readonly readAt?: number
  readonly createdAt?: string
  readonly data?: Readonly<Record<string, unknown>>
}

const RECORD_ROUTES: Readonly<Record<string, string>> = {
  organization: 'organizations',
  contact: 'contacts',
  lead: 'leads',
  deal: 'deals',
  project: 'projects',
  task: 'tasks',
}

const humanize = (value = 'Update') => value.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase())

function notificationCopy(item: NotificationItem): string {
  const message = item.data?.message ?? item.data?.title
  return typeof message === 'string' && message.trim() !== '' ? message : humanize(item.type)
}

// eslint-disable-next-line max-lines-per-function -- the notification sheet keeps its fetch and read state together.
export function WorkspaceNotifications({ locale }: Readonly<{ locale: Locale }>) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(0)
  const [items, setItems] = useState<readonly NotificationItem[]>([])
  const [loading, setLoading] = useState(false)
  const copy = NOTIFICATION_COPY[locale]
  const shellCopy = SHELL_COPY[locale]

  useEffect(() => {
    void fetch('/api/v1/notifications/unread-count', { credentials: 'same-origin' })
      .then((response) => response.json())
      .then((data) => {
        setCount((data as { count?: number }).count ?? 0)
      })
      .catch(() => {
        setCount(0)
      })
  }, [])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    void fetch('/api/v1/notifications', { credentials: 'same-origin' })
      .then((response) => response.json())
      .then((data) => {
        setItems((data as { notifications?: readonly NotificationItem[] }).notifications ?? [])
      })
      .catch(() => {
        setItems([])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [open])

  const select = async (item: NotificationItem) => {
    if (item.readAt === undefined) {
      await fetch(`/api/v1/notifications/${item.id}`, { method: 'PATCH' })
      setCount((current) => Math.max(0, current - 1))
      setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, readAt: Date.now() } : entry)))
    }
    const route = item.recordType === undefined ? undefined : RECORD_ROUTES[item.recordType]
    if (route !== undefined && item.recordId !== undefined) {
      setOpen(false)
      router.push(item.recordType === 'task' ? taskHref(item.recordId, pathname) : `/${route}/${item.recordId}`)
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
        <div className="space-y-2 overflow-y-auto px-4 pb-6">
          {loading ? <p className="py-8 text-center text-sm text-muted-foreground" aria-live="polite">{copy.loading}</p> : null}
          {!loading && items.length === 0 ? (
            <div className="grid place-items-center gap-2 py-12 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="size-6" aria-hidden />
              {copy.caughtUp}
            </div>
          ) : null}
          {items.map((item) => (
            <button
              type="button"
              className="w-full rounded-lg border bg-card p-3 text-left shadow-xs transition-[background-color,box-shadow] hover:bg-muted"
              key={item.id}
              onClick={() => void select(item)}
            >
              <span className="flex items-start gap-2">
                <span
                  className={`mt-1.5 size-1.5 shrink-0 rounded-full ${item.readAt === undefined ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                />
                <span>
                  <span className="block text-sm font-medium">{notificationCopy(item)}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {shellCopy[item.recordType ?? ''] ?? humanize(item.recordType ?? item.type)}
                  </span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
