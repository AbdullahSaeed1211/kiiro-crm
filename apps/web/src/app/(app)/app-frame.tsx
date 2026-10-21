'use client'

import { AppShell } from '@ops/ui/composites/AppShell'
import { AppSidebar } from '@ops/ui/composites/AppSidebar'
import { LogOut, Settings } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import type { WorkProfile } from '@ops/platform'
import { WorkspaceTools } from './workspace-tools'
import { navGroups, routeCopyKey } from './app-navigation'
import { SHELL_COPY, type Locale } from '../../i18n/config'

async function logOut() {
  try {
    await fetch('/api/users/logout', { method: 'POST', credentials: 'same-origin' })
  } finally {
    window.location.assign('/login')
  }
}

function SidebarAccount({
  name,
  email,
  role,
  locale,
}: Readonly<{ name: string; email: string; role: string; locale: Locale }>) {
  const settingsLabel = SHELL_COPY[locale].settings
  return (
    <div className="space-y-1">
      <a
        className="ops-sidebar-user focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        href="/settings/profile"
      >
        <span className="ops-brand-mark grid size-8 place-items-center text-xs font-semibold text-primary-foreground">
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 group-data-[collapsible=icon]:hidden">
          <span className="block truncate text-xs font-medium">{name}</span>
          <span className="block truncate text-xs text-muted-foreground">{email || role}</span>
        </span>
      </a>
      <a
        className="ops-sidebar-user focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        href={role === 'staff' ? '/settings/profile' : '/settings/general'}
      >
        <span className="grid size-8 place-items-center">
          <Settings className="size-4" aria-hidden />
        </span>
        <span className="text-sm group-data-[collapsible=icon]:hidden">{settingsLabel}</span>
      </a>
      <button
        type="button"
        className="ops-sidebar-user w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => void logOut()}
      >
        <span className="grid size-8 place-items-center">
          <LogOut className="size-4" aria-hidden />
        </span>
        <span className="text-sm group-data-[collapsible=icon]:hidden">{SHELL_COPY[locale].logout}</span>
      </button>
    </div>
  )
}

/** Application frame whose navigation reflects the current route. */
export function AppFrame({
  defaultOpen,
  appName,
  compactLogoUrl,
  modules,
  terminology,
  userName,
  userEmail,
  role,
  workProfile,
  locale,
  children,
}: Readonly<{
  defaultOpen: boolean
  appName: string
  compactLogoUrl: string
  modules: Readonly<Record<string, boolean>>
  terminology: Readonly<Record<string, unknown>>
  userName: string
  userEmail: string
  role: string
  workProfile: WorkProfile
  locale: Locale
  children: ReactNode
}>) {
  const pathname = usePathname()
  useEffect(() => {
    const segment = pathname.split('/').find(Boolean)
    const copy = SHELL_COPY[locale]
    const segmentKey = routeCopyKey(segment)
    const label =
      segmentKey === undefined
        ? copy.dashboard
        : (copy[segmentKey] ?? `${segmentKey.charAt(0).toUpperCase()}${segmentKey.slice(1)}`)
    const title = `${label} · ${appName}`
    document.title = title
    const timer = window.setTimeout(() => {
      document.title = title
    }, 50)
    return () => {
      window.clearTimeout(timer)
    }
  }, [appName, locale, pathname])
  useEffect(() => {
    const taskId = window.sessionStorage.getItem('task-panel-focus-return')
    if (taskId === null) return
    const returnPath = window.sessionStorage.getItem('task-panel-focus-path')
    const returnPathname = returnPath === null ? null : new URL(returnPath, window.location.origin).pathname
    if (returnPathname !== null && returnPathname !== pathname) return
    const trigger = [...document.querySelectorAll<HTMLElement>('[data-task-link-id]')].find(
      (element) => element.dataset.taskLinkId === taskId && element.getClientRects().length > 0,
    )
    if (trigger === undefined) return
    trigger.focus({ preventScroll: true })
    window.sessionStorage.removeItem('task-panel-focus-return')
    window.sessionStorage.removeItem('task-panel-focus-path')
  }, [pathname])
  return (
    <AppShell
      defaultOpen={defaultOpen}
      utilities={<WorkspaceTools locale={locale} />}
      sidebar={
        <AppSidebar
          appName={appName}
          logo={<img className="size-6 object-contain" src={compactLogoUrl} alt="" width={24} height={24} />}
          groups={navGroups({ pathname, modules, terminology, role, workProfile, locale })}
          footer={<SidebarAccount name={userName} email={userEmail} role={role} locale={locale} />}
        />
      }
    >
      {children}
    </AppShell>
  )
}
