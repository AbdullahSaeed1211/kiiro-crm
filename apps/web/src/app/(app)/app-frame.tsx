'use client'

import { AppShell } from '@ops/ui/composites/AppShell'
import { AppSidebar, type NavGroup } from '@ops/ui/composites/AppSidebar'
import { CalendarDays, ChartGantt, CircleCheckBig, LayoutDashboard, ListTodo, type LucideIcon } from 'lucide-react'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

// Default product name until settings.appName exists (decision D-05).
const APP_NAME = 'Workspace'

type NavLink = readonly [label: string, href: string, icon: LucideIcon]

const GENERAL: readonly NavLink[] = [
  ['Dashboard', '/', LayoutDashboard],
  ['My tasks', '/my-tasks', CircleCheckBig],
]

const WORK: readonly NavLink[] = [
  ['Tasks', '/tasks', ListTodo],
  ['Calendar', '/calendar', CalendarDays],
  ['Timeline', '/timeline', ChartGantt],
]

// Exact match for the dashboard, prefix match for sections with detail routes (spec §16.2).
function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
}

function navGroups(pathname: string): NavGroup[] {
  const item = ([label, href, icon]: NavLink) => ({ label, href, icon, active: isActive(pathname, href) })
  return [
    { id: 'general', items: GENERAL.map(item) },
    { id: 'work', label: 'Work', items: WORK.map(item) },
  ]
}

/** Application frame whose navigation reflects the current route. */
export function AppFrame({ defaultOpen, children }: Readonly<{ defaultOpen: boolean; children: ReactNode }>) {
  const pathname = usePathname()
  return (
    <AppShell defaultOpen={defaultOpen} sidebar={<AppSidebar appName={APP_NAME} groups={navGroups(pathname)} />}>
      {children}
    </AppShell>
  )
}
