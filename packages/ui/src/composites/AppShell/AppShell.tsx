import type { ReactNode } from 'react'
import { SidebarInset, SidebarProvider } from '@ops/ui/components/ui/sidebar'
import { TooltipProvider } from '@ops/ui/components/ui/tooltip'

/** Props of {@link AppShell}. */
export type AppShellProps = Readonly<{
  /** Sidebar element, normally an `AppSidebar`. */
  sidebar: ReactNode
  /** Initial expanded state; the app reads the sidebar cookie so the first render matches the persisted choice. */
  defaultOpen?: boolean
  /** The page: an `AppHeader` followed by `PageContent`. */
  children: ReactNode
  /** Persistent workspace controls rendered above each page header. */
  utilities?: ReactNode
}>

/** Application frame (spec §16.1): tooltip and sidebar providers, the sidebar and an inset for the page. */
export function AppShell({ sidebar, defaultOpen = true, children, utilities }: AppShellProps) {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        {sidebar}
        <SidebarInset className="ops-shell-inset">
          {utilities === undefined ? null : <div className="ops-shell-utilities">{utilities}</div>}
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
