import type { ReactNode } from 'react'

/** Props of {@link PageHeader}. */
export type PageHeaderProps = Readonly<{
  title: string
  /** Record total shown next to the title on list pages. */
  count?: number
  description?: string
  /** Right-aligned controls such as view switchers and the New button. */
  actions?: ReactNode
}>

/** Page title row (spec §15.3, §17.5): title with optional count and description, plus an actions slot. */
export function PageHeader({ title, count, description, actions }: PageHeaderProps) {
  return (
    <div className="ops-page-header flex flex-wrap items-start justify-between gap-2">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="flex items-baseline gap-2 text-xl font-semibold">
          <span className="truncate">{title}</span>
          {count === undefined ? null : (
            <span className="text-sm font-normal text-muted-foreground tabular-nums">{count}</span>
          )}
        </h1>
        {description === undefined ? null : <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {actions === undefined ? null : <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
