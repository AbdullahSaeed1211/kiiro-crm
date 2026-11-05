'use client'

import { HeaderTrailProvider, type ReportedTrail } from '@ops/ui/composites/AppHeader'
import { AppShell } from '@ops/ui/composites/AppShell'
import { AppSidebar } from '@ops/ui/composites/AppSidebar'
import { usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import type { WorkProfile } from '@ops/platform'
import { WorkspaceTools } from './workspace-tools'
import { AccountMenu } from './account-menu'
import { ShortcutsHelp } from './shortcuts-help'
import { useDocumentTitle, useTaskFocusReturn } from './use-frame-effects'
import { useShellNavigation } from './use-shell-navigation'
import type { Locale } from '../../i18n/config'

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
  const { groups, entries, creates, section, helpOpen, setHelpOpen, openHelp } = useShellNavigation({
    pathname,
    modules,
    terminology,
    role,
    workProfile,
    locale,
  })
  const [trail, setTrail] = useState<ReportedTrail | null>(null)
  useDocumentTitle({ pathname, trail, appName, locale })
  useTaskFocusReturn(pathname)
  return (
    <AppShell
      defaultOpen={defaultOpen}
      utilities={<WorkspaceTools locale={locale} entries={entries} creates={creates} openHelp={openHelp} />}
      sidebar={
        <AppSidebar
          appName={appName}
          logo={<img className="size-6 object-contain" src={compactLogoUrl} alt="" width={24} height={24} />}
          groups={groups}
          footer={
            <AccountMenu name={userName} email={userEmail} role={role} locale={locale} onShowShortcuts={openHelp} />
          }
        />
      }
    >
      <HeaderTrailProvider section={section} onTrail={setTrail}>
        {children}
      </HeaderTrailProvider>
      <ShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} entries={entries} />
    </AppShell>
  )
}
