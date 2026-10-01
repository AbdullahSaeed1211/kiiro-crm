import Link from 'next/link'
import { cn } from '@ops/ui/lib/utils'

export type ViewOption = Readonly<{ id: string; label: string; href: string }>

/** A small segmented control that links between the representations of one list, such as table, board and calendar. */
export function ViewSwitcher({
  label,
  views,
  active,
}: Readonly<{ label: string; views: readonly ViewOption[]; active: string }>) {
  return (
    <nav aria-label={label} className="inline-flex max-w-full items-center rounded-lg border border-border p-0.5">
      {views.map((view) => {
        const selected = view.id === active
        return (
          <Link
            key={view.id}
            href={view.href}
            aria-current={selected ? 'page' : undefined}
            className={cn(
              'inline-flex h-9 shrink-0 items-center rounded-md px-3 text-xs font-medium sm:h-7 sm:px-2.5 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              selected ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
            )}
          >
            {view.label}
          </Link>
        )
      })}
    </nav>
  )
}
