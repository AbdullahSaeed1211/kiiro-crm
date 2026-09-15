'use client'

import Link from 'next/link'
import { TASK_COPY, type Locale } from '../../../i18n/config'

export type TaskWorkspaceView = 'table' | 'board' | 'calendar' | 'gantt'

const VIEWS: readonly { id: TaskWorkspaceView; labelKey: 'table' | 'board' | 'calendar' | 'gantt'; href: string }[] = [
  { id: 'table', labelKey: 'table', href: '/tasks' },
  { id: 'board', labelKey: 'board', href: '/tasks/board' },
  { id: 'calendar', labelKey: 'calendar', href: '/calendar' },
  { id: 'gantt', labelKey: 'gantt', href: '/timeline' },
]

/** Compact navigation between the task workspace's supported representations. */
export function TaskWorkspaceViews({
  active,
  locale = 'en',
}: Readonly<{ active: TaskWorkspaceView; locale?: Locale }>) {
  const copy = TASK_COPY[locale]
  return (
    <nav aria-label={copy.views} className="inline-flex max-w-full items-center rounded-lg border border-border p-0.5">
      {VIEWS.map((view) => {
        const selected = view.id === active
        return (
          <Link
            key={view.id}
            href={view.href}
            aria-current={selected ? 'page' : undefined}
            className={`inline-flex h-7 shrink-0 items-center rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
              selected ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
            }`}
          >
            {copy[view.labelKey]}
          </Link>
        )
      })}
    </nav>
  )
}
