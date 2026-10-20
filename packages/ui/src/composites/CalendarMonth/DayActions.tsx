'use client'

import { ContextMenu } from '@base-ui/react/context-menu'
import type { ReactNode } from 'react'

/** Right-click and long-press creation without replacing the browser menu on event links. */
export function DayActions({
  children,
  date,
  creation,
}: Readonly<{
  children: ReactNode
  date: string
  creation?: Readonly<{ label: string; onCreate: (date: string) => void }> | undefined
}>) {
  if (creation === undefined) return <>{children}</>
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger
        className="h-full"
        onContextMenu={(event) => {
          if ((event.target as HTMLElement).closest('a') !== null) event.preventBaseUIHandler()
        }}
      >
        {children}
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Positioner className="z-50">
          <ContextMenu.Popup className="min-w-40 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md">
            <ContextMenu.Item
              className="cursor-default rounded-md px-3 py-2 text-sm outline-none data-highlighted:bg-accent"
              onClick={() => {
                creation.onCreate(date)
              }}
            >
              {creation.label}
            </ContextMenu.Item>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}
