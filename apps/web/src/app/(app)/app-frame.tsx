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
import { SHELL_COPY, type Locale } from '../../i18n/config'

type NavLink = readonly [key: string, href: string, icon: LucideIcon]

const GENERAL: readonly NavLink[] = [
  ['dashboard', '/', LayoutDashboard],
  ['myTasks', '/my-tasks', CircleCheckBig],
]

const CRM: readonly NavLink[] = [
  ['leads', '/leads', UserPlus],
  ['deals', '/deals', Handshake],
  ['organizations', '/organizations', Building2],
  ['contacts', '/contacts', Contact],
]

const WORK: readonly NavLink[] = [
  ['projects', '/projects', FolderKanban],
  ['tasks', '/tasks', ListTodo],
  ['calendar', '/calendar', CalendarDays],
  ['timeline', '/timeline', ChartGantt],
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
  locale,
}: Readonly<{
  pathname: string
  modules: Readonly<Record<string, boolean>>
  terminology: Readonly<Record<string, unknown>>
  role: string
  locale: Locale
}>): NavGroup[] {
  const copy = SHELL_COPY[locale]
  const label = (key: string, fallback: string) => {
    const value = terminology[key]
    return typeof value === 'string' && value !== '' ? value : fallback
  }
  const item = ([key, href, icon]: NavLink) => ({
    label: label(key, copy[key] ?? key),
    href,
    icon,
    active: isActive(pathname, href),
  })
  const groups: NavGroup[] = [{ id: 'general', items: GENERAL.map(item) }]
  if (modules.mail && (role === 'owner' || role === 'manager'))
    groups[0] = { id: 'general', items: [...GENERAL.map(item), item(['inbox', '/inbox', Mail])] }
  if (modules.crm)
    groups.push({
      id: 'crm',
      label: label('crmGroup', copy.crm),
      items: CRM.map(item),
    })
  if (modules.work)
    groups.push({
      id: 'work',
      label: label('workGroup', copy.work),
      items: WORK.map(item),
    })
  return groups
}

function SidebarAccount({ name, email, role, locale }: Readonly<{ name: string; email: string; role: string; locale: Locale }>) {
  const settingsLabel = SHELL_COPY[locale].settings
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
        <span className="text-sm group-data-[collapsible=icon]:hidden">{settingsLabel}</span>
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
  locale,
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
  locale: Locale
  children: ReactNode
}>) {
  const pathname = usePathname()
  useEffect(() => {
    const segment = pathname.split('/').find(Boolean)
    const copy = SHELL_COPY[locale]
    const segmentKey = segment === 'my-tasks' ? 'myTasks' : segment
    const label = segmentKey === undefined ? copy.dashboard : (copy[segmentKey] ?? `${segmentKey.charAt(0).toUpperCase()}${segmentKey.slice(1)}`)
    const title = `${label} · ${appName}`
    document.title = title
    const timer = window.setTimeout(() => {
      document.title = title
    }, 50)
    return () => {
      window.clearTimeout(timer)
    }
  }, [appName, locale, pathname])
  return (
    <AppShell
      defaultOpen={defaultOpen}
      utilities={<WorkspaceTools locale={locale} appName={appName} />}
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
          groups={navGroups({ pathname, modules, terminology, role, locale })}
          footer={<SidebarAccount name={userName} email={userEmail} role={role} locale={locale} />}
        />
      }
    >
      {children}
    </AppShell>
  )
}
