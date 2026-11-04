'use client'

import { Separator } from '@ops/ui/components/ui/separator'
import { SidebarTrigger, useSidebar } from '@ops/ui/components/ui/sidebar'

/** Keeps one global navigation control visible at a time across desktop states, with its divider. */
export function ResponsiveSidebarTrigger() {
  const { state } = useSidebar()
  const visible = state === 'collapsed' ? 'md:flex' : 'md:hidden'
  return (
    <>
      <SidebarTrigger className={`-ml-1 ${visible}`} />
      <Separator orientation="vertical" className={`my-auto mr-2 data-vertical:h-4 ${visible}`} />
    </>
  )
}
