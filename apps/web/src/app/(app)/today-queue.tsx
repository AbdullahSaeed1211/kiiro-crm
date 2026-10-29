import { Button } from '@ops/ui/components/ui/button'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@ops/ui/lib/utils'

/** A short work queue with one action on each row and an exact total across all visible records. */
export function TodayQueue({
  title,
  count,
  icon: Icon,
  href,
  viewAll,
  empty,
  children,
  compact = false,
}: Readonly<{
  title: string
  count: number
  icon: LucideIcon
  href: string
  viewAll: string
  empty: string
  children: ReactNode
  compact?: boolean
}>) {
  return (
    <section className="min-w-0 rounded-xl border bg-card" aria-label={title}>
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-3 border-b',
          compact ? 'px-3 py-2' : 'px-4 py-3 sm:px-5',
        )}
      >
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
        <p className={cn('text-sm text-muted-foreground', compact ? 'px-3 py-3' : 'px-4 py-5 sm:px-5')}>{empty}</p>
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
  accessory,
  compact = false,
}: Readonly<{
  title: string
  detail: string
  when?: string
  href: string
  action: string
  overdue?: boolean
  taskId?: string
  accessory?: ReactNode
  compact?: boolean
}>) {
  return (
    <li className={cn('flex items-center gap-2', compact ? 'px-3 py-2.5' : 'gap-3 px-4 py-4 sm:gap-5 sm:px-5')}>
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-medium">{title}</p>
        <p className="mt-1 break-words text-xs text-muted-foreground">{detail}</p>
        {when === undefined ? null : (
          <p className={`mt-1 text-xs ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>{when}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {accessory}
        <Button
          size="sm"
          variant="outline"
          className="shrink-0"
          nativeButton={false}
          render={<Link href={href} data-task-link-id={taskId} aria-label={`${action}: ${title}`} />}
        >
          {action}
        </Button>
      </div>
    </li>
  )
}
