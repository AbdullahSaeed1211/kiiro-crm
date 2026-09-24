'use client'

import { SidebarTrigger, useSidebar } from '@ops/ui/components/ui/sidebar'

/** Keeps one global navigation control visible at a time across desktop states. */
export function ResponsiveSidebarTrigger() {
  const { state } = useSidebar()
  return <SidebarTrigger className={`-ml-1 ${state === 'collapsed' ? 'md:flex' : 'md:hidden'}`} />
}
