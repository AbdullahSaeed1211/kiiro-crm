import { Fragment, type ReactNode } from 'react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@ops/ui/components/ui/breadcrumb'
import { Separator } from '@ops/ui/components/ui/separator'
import { ResponsiveSidebarTrigger } from './ResponsiveSidebarTrigger'

/** One breadcrumb level; the last level is the current page. */
export type BreadcrumbEntry = Readonly<{
  label: string
  href?: string
}>

/** Props of {@link AppHeader}. */
export type AppHeaderProps = Readonly<{
  /** Section and record titles, outermost first; only the last three levels are shown (spec §16.3). */
  breadcrumbs: readonly BreadcrumbEntry[]
  /** Right-aligned controls such as search, create and notifications. */
  actions?: ReactNode
}>

const MAX_LEVELS = 3
const MAX_TITLE_LENGTH = 32

function truncateTitle(label: string): string {
  return label.length > MAX_TITLE_LENGTH ? `${label.slice(0, MAX_TITLE_LENGTH - 1)}…` : label
}

function Crumb({ entry }: Readonly<{ entry: BreadcrumbEntry }>) {
  const label = truncateTitle(entry.label)
  if (entry.href === undefined) {
    return (
      <BreadcrumbPage className="truncate" title={entry.label}>
        {label}
      </BreadcrumbPage>
    )
  }
  return (
    <BreadcrumbLink href={entry.href} className="truncate" title={entry.label}>
      {label}
    </BreadcrumbLink>
  )
}

/** Sticky page header (spec §16.3): sidebar toggle, breadcrumb and an actions slot. */
export function AppHeader({ breadcrumbs, actions }: AppHeaderProps) {
  const levels = breadcrumbs.slice(-MAX_LEVELS)
  const lastIndex = levels.length - 1
  return (
    <header className="ops-app-header sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background px-4 md:rounded-t-xl">
      <ResponsiveSidebarTrigger />
      <Separator orientation="vertical" className="my-auto mr-2 data-vertical:h-4" />
      <Breadcrumb className="min-w-0">
        <BreadcrumbList className="flex-nowrap">
          {levels.map((entry, index) => (
            <Fragment key={`${entry.label}:${entry.href ?? ''}`}>
              {index > 0 ? <BreadcrumbSeparator className="max-md:hidden" /> : null}
              {/* Below md only the last crumb is shown next to the trigger. */}
              <BreadcrumbItem className={index === lastIndex ? 'min-w-0' : 'max-md:hidden'}>
                <Crumb entry={entry} />
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      {actions === undefined ? null : <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </header>
  )
}
