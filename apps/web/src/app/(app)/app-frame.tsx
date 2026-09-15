'use client'

import { AppShell } from '@ops/ui/composites/AppShell'
import { AppSidebar, type NavGroup } from '@ops/ui/composites/AppSidebar'
import {
  Building2,
  CalendarDays,
  ChartGantt,
  CircleCheckBig,
  Contact,
  FolderKanban,
  Handshake,
  LayoutDashboard,
  ListTodo,
  Mail,
  Settings,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import { WorkspaceTools } from './workspace-tools'

type NavLink = readonly [label: string, href: string, icon: LucideIcon]

const GENERAL: readonly NavLink[] = [
  ['Dashboard', '/', LayoutDashboard],
  ['My tasks', '/my-tasks', CircleCheckBig],
]

const CRM: readonly NavLink[] = [
  ['Leads', '/leads', UserPlus],
  ['Deals', '/deals', Handshake],
  ['Organizations', '/organizations', Building2],
  ['Contacts', '/contacts', Contact],
]

const WORK: readonly NavLink[] = [
  ['Projects', '/projects', FolderKanban],
  ['Tasks', '/tasks', ListTodo],
  ['Calendar', '/calendar', CalendarDays],
  ['Timeline', '/timeline', ChartGantt],
]

// Exact match for the dashboard, prefix match for sections with detail routes (spec §16.2).
function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
}

function navGroups({
  pathname,
  modules,
  terminology,
  role,
}: Readonly<{
  pathname: string
  modules: Readonly<Record<string, boolean>>
  terminology: Readonly<Record<string, unknown>>
  role: string
}>): NavGroup[] {
  const item = ([label, href, icon]: NavLink) => ({ label, href, icon, active: isActive(pathname, href) })
  const label = (key: string, fallback: string) => {
    const value = terminology[key]
    return typeof value === 'string' && value !== '' ? value : fallback
  }
  const groups: NavGroup[] = [{ id: 'general', items: GENERAL.map(item) }]
  if (modules.mail && (role === 'owner' || role === 'manager'))
    groups[0] = { id: 'general', items: [...GENERAL.map(item), item(['Inbox', '/inbox', Mail])] }
  if (modules.crm)
    groups.push({
      id: 'crm',
      label: label('crmGroup', 'CRM'),
      items: CRM.map(([text, href, icon]) => item([label(text.toLowerCase(), text), href, icon])),
    })
  if (modules.work)
    groups.push({
      id: 'work',
      label: label('workGroup', 'Work'),
      items: WORK.map(([text, href, icon]) => item([label(text.toLowerCase().replaceAll(' ', ''), text), href, icon])),
    })
  return groups
}

function SidebarAccount({ name, email, role }: Readonly<{ name: string; email: string; role: string }>) {
  return (
    <div className="space-y-1">
      <a className="ops-sidebar-user focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href="/settings/profile">
        <span className="ops-brand-mark grid size-8 place-items-center text-xs font-semibold text-primary-foreground">
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 group-data-[collapsible=icon]:hidden">
          <span className="block truncate text-xs font-medium">{name}</span>
          <span className="block truncate text-[10px] text-muted-foreground">{email || role}</span>
        </span>
      </a>
      <a className="ops-sidebar-user focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={role === 'staff' ? '/settings/profile' : '/settings/general'}>
        <span className="grid size-8 place-items-center">
          <Settings className="size-4" aria-hidden />
        </span>
        <span className="text-sm group-data-[collapsible=icon]:hidden">Settings</span>
      </a>
    </div>
  )
}

/** Application frame whose navigation reflects the current route. */
export function AppFrame({
  defaultOpen,
  appName,
  logoFileKey,
  modules,
  terminology,
  userName,
  userEmail,
  role,
  children,
}: Readonly<{
  defaultOpen: boolean
  appName: string
  logoFileKey?: string | null
  modules: Readonly<Record<string, boolean>>
  terminology: Readonly<Record<string, unknown>>
  userName: string
  userEmail: string
  role: string
  children: ReactNode
}>) {
  const pathname = usePathname()
  useEffect(() => {
    const segment = pathname.split('/').find(Boolean)
    let label = 'Dashboard'
    if (segment !== undefined)
      label = segment === 'my-tasks' ? 'My tasks' : `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`
    const title = `${label} · ${appName}`
    document.title = title
    const timer = window.setTimeout(() => {
      document.title = title
    }, 50)
    return () => {
      window.clearTimeout(timer)
    }
  }, [appName, pathname])
  return (
    <AppShell
      defaultOpen={defaultOpen}
      utilities={<WorkspaceTools />}
      sidebar={
        <AppSidebar
          appName={appName}
          logo={
            logoFileKey === undefined || logoFileKey === null ? undefined : (
              <img
                className="max-h-8 max-w-28 object-contain"
                src={`/api/v1/brand/logo?v=${encodeURIComponent(logoFileKey)}`}
                alt={`${appName} logo`}
                width={112}
                height={32}
              />
            )
          }
          groups={navGroups({ pathname, modules, terminology, role })}
          footer={<SidebarAccount name={userName} email={userEmail} role={role} />}
        />
      }
    >
      {children}
    </AppShell>
  )
}
