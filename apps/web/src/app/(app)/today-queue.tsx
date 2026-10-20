import { Button } from '@ops/ui/components/ui/button'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

/** A short work queue with one action on each row and an exact total across all visible records. */
export function TodayQueue({
  title,
  count,
  icon: Icon,
  href,
  viewAll,
  empty,
  children,
}: Readonly<{
  title: string
  count: number
  icon: LucideIcon
  href: string
  viewAll: string
  empty: string
  children: ReactNode
}>) {
  return (
    <section className="min-w-0 rounded-xl border bg-card" aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Icon aria-hidden className="size-4 text-muted-foreground" />
          {title}
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {count}
          </span>
        </h2>
        {count > 0 ? (
          <Link
            href={href}
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {viewAll}
          </Link>
        ) : null}
      </div>
      {count === 0 ? (
        <p className="px-4 py-5 text-sm text-muted-foreground sm:px-5">{empty}</p>
      ) : (
        <ul className="divide-y">{children}</ul>
      )}
    </section>
  )
}

export function TodayItem({
  title,
  detail,
  when,
  href,
  action,
  overdue = false,
  taskId,
}: Readonly<{
  title: string
  detail: string
  when?: string
  href: string
  action: string
  overdue?: boolean
  taskId?: string
}>) {
  return (
    <li className="flex items-center gap-3 px-4 py-4 sm:gap-5 sm:px-5">
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-medium">{title}</p>
        <p className="mt-1 break-words text-xs text-muted-foreground">{detail}</p>
        {when === undefined ? null : (
          <p className={`mt-1 text-xs ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>{when}</p>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0"
        nativeButton={false}
        render={<Link href={href} data-task-link-id={taskId} aria-label={`${action}: ${title}`} />}
      >
        {action}
      </Button>
    </li>
  )
}
