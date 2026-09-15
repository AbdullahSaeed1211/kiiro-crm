'use client'

import Link from 'next/link'

export type TaskWorkspaceView = 'table' | 'board' | 'gantt'

const VIEWS: readonly { id: TaskWorkspaceView; label: string; href: string }[] = [
  { id: 'table', label: 'Table', href: '/tasks' },
  { id: 'board', label: 'Kanban', href: '/tasks/board' },
  { id: 'gantt', label: 'Gantt', href: '/timeline' },
]

/** Compact navigation between the task workspace's supported representations. */
export function TaskWorkspaceViews({ active }: Readonly<{ active: TaskWorkspaceView }>) {
  return (
    <nav aria-label="Task views" className="inline-flex max-w-full items-center rounded-lg border border-border p-0.5">
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
            {view.label}
          </Link>
        )
      })}
    </nav>
  )
}
