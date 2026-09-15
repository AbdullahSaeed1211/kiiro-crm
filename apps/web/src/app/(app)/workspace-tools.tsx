'use client'

import { useTheme } from '@ops/ui'
import { Button } from '@ops/ui/components/ui/button'
import { useSidebar } from '@ops/ui/components/ui/sidebar'
import { Moon, Sun } from 'lucide-react'
import { WorkspaceNotifications } from './workspace-notifications'
import { WorkspaceSearch } from './workspace-search'
import type { Locale } from '../../i18n/config'

export function WorkspaceTools({ locale, appName }: Readonly<{ locale: Locale; appName: string }>) {
  const { isMobile } = useSidebar()
  const { theme, setTheme } = useTheme()
  const toggleTheme = () => {
    const currentlyDark = document.documentElement.classList.contains('dark')
    setTheme(currentlyDark ? 'light' : 'dark')
  }
  return (
    <>
      {isMobile ? (
        <span translate="no" className="mr-auto min-w-0 max-w-[9rem] truncate text-sm font-semibold">
          {appName}
        </span>
      ) : null}
      <WorkspaceSearch locale={locale} />
      <WorkspaceNotifications locale={locale} />
      <Button variant="ghost" size="icon-sm" aria-label="Toggle color theme" onClick={toggleTheme}>
        {theme === 'dark' ? <Sun aria-hidden /> : <Moon aria-hidden />}
      </Button>
    </>
  )
}
