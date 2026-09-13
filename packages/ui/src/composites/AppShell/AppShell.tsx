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
}>

/** Application frame (spec §16.1): tooltip and sidebar providers, the sidebar and an inset for the page. */
export function AppShell({ sidebar, defaultOpen = true, children }: AppShellProps) {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        {sidebar}
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
