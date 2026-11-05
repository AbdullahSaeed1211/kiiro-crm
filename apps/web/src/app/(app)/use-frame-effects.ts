import type { ReportedTrail } from '@ops/ui/composites/AppHeader'
import { useEffect } from 'react'
import { SHELL_COPY, type Locale } from '../../i18n/config'
import { routeCopyKey } from './app-navigation'

function sectionLabel(pathname: string, locale: Locale): string {
  const copy = SHELL_COPY[locale]
  const segmentKey = routeCopyKey(pathname.split('/').find(Boolean))
  if (segmentKey === undefined) return copy.dashboard
  return copy[segmentKey] ?? `${segmentKey.charAt(0).toUpperCase()}${segmentKey.slice(1)}`
}

/** The tab title: the open record's own title when the page reported one ("Acme Ltd"), else the section's name. */
export function useDocumentTitle({
  pathname,
  trail,
  appName,
  locale,
}: Readonly<{ pathname: string; trail: ReportedTrail | null; appName: string; locale: Locale }>) {
  useEffect(() => {
    const reported = trail?.pathname === pathname ? trail.entries.at(-1)?.label : undefined
    const title = `${reported ?? sectionLabel(pathname, locale)} · ${appName}`
    document.title = title
    const timer = window.setTimeout(() => {
      document.title = title
    }, 50)
    return () => {
      window.clearTimeout(timer)
    }
  }, [appName, locale, pathname, trail])
}

/** Closing a task panel returns focus to the link that opened it. */
export function useTaskFocusReturn(pathname: string) {
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
}
