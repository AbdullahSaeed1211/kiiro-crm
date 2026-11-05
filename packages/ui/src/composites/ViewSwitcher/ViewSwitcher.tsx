import Link from 'next/link'
import { cn } from '@ops/ui/lib/utils'

export type ViewOption = Readonly<{ id: string; label: string; href: string }>

/**
 * One row of tabs that link between the representations of a list, such as table, board and calendar. The row never
 * wraps: on a phone it scrolls sideways, so it keeps one height on every screen. Give it to `PageHeader`'s `tabs`.
 */
export function ViewSwitcher({
  label,
  views,
  active,
}: Readonly<{ label: string; views: readonly ViewOption[]; active: string }>) {
  return (
    <nav
      aria-label={label}
      className="no-scrollbar -mb-px -ml-2.5 flex w-full max-w-full items-end gap-1 overflow-x-auto"
    >
      {views.map((view) => {
        const selected = view.id === active
        return (
          <Link
            key={view.id}
            href={view.href}
            aria-current={selected ? 'page' : undefined}
            className={cn(
              'relative inline-flex h-9 shrink-0 items-center px-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-md',
              'after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:transition-colors',
              selected
                ? 'text-foreground after:bg-primary'
                : 'text-muted-foreground after:bg-transparent hover:text-foreground',
            )}
          >
            {view.label}
          </Link>
        )
      })}
    </nav>
  )
}
