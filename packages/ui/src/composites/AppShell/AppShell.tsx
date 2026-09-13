import type { ReactNode } from 'react'
import { SidebarInset, SidebarProvider } from '@ops/ui/components/ui/sidebar'
import { TooltipProvider } from '@ops/ui/components/ui/tooltip'

/** Props of {@link AppShell}. */
export type AppShellProps = Readonly<{
  /** Sidebar element, normally an `AppSidebar`. */
  sidebar: ReactNode
  /** Header element, normally an `AppHeader`. */
  header: ReactNode
  /** Initial expanded state; the app reads the sidebar cookie so the first render matches the persisted choice. */
  defaultOpen?: boolean
  children: ReactNode
}>

/** Application frame (spec §16.1): tooltip and sidebar providers, the sidebar, and an inset with header and page content. */
export function AppShell({ sidebar, header, defaultOpen = true, children }: AppShellProps) {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        {sidebar}
        <SidebarInset>
          {header}
          {/* SidebarInset already renders the <main> landmark, so the content wrapper is a plain div. */}
          <div className="flex flex-1 flex-col gap-4 px-4 py-3 md:px-6 md:py-4">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
