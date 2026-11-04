import { useCallback, useMemo, useState } from 'react'
import type { WorkProfile } from '@ops/platform'
import type { Locale } from '../../i18n/config'
import { NAV_COPY } from '../../i18n/nav-copy'
import { createLinks, isNavActive, navEntries, navGroups, navSections } from './app-navigation'
import { useNavCounts } from './use-nav-counts'

/** Everything the frame derives from who is looking: the sidebar groups, the flat list, the New menu and the open section. */
export function useShellNavigation({
  pathname,
  modules,
  terminology,
  role,
  workProfile,
  locale,
}: Readonly<{
  pathname: string
  modules: Readonly<Record<string, boolean>>
  terminology: Readonly<Record<string, unknown>>
  role: string
  workProfile: WorkProfile
  locale: Locale
}>) {
  const viewer = useMemo(
    () => ({ modules, terminology, role, workProfile, locale }),
    [modules, terminology, role, workProfile, locale],
  )
  const sections = useMemo(() => navSections(viewer), [viewer])
  const entries = useMemo(() => navEntries(sections), [sections])
  const creates = useMemo(() => createLinks(viewer), [viewer])
  const counts = useNavCounts(pathname)
  const countLabels = useMemo(() => {
    const copy = NAV_COPY[locale]
    return {
      myTasks: (count: number) => copy.overdue.replace('{count}', String(count)),
      leads: (count: number) => copy.toFollowUp.replace('{count}', String(count)),
    }
  }, [locale])
  const section = sections.find(
    (item) => item.label !== undefined && item.entries.some((nav) => isNavActive(pathname, nav.href)),
  )?.label
  const groups = navGroups({ sections, pathname, counts, countLabels })
  const [helpOpen, setHelpOpen] = useState(false)
  const openHelp = useCallback(() => {
    setHelpOpen(true)
  }, [])
  return { groups, entries, creates, section, helpOpen, setHelpOpen, openHelp }
}
