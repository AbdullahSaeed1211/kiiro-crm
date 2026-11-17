'use client'

import { CreateMenu } from './create-menu'
import { WorkspaceNotifications } from './workspace-notifications'
import { WorkspaceSearch } from './workspace-search'
import type { NavEntry, createLinks } from './app-navigation'
import type { Locale } from '../../i18n/config'
import { CallingHeaderAction } from './calling/calling-header-action'

/** Search, New and notifications. The workspace name stays in the sidebar and the theme switch in the account menu, so the header stays short on a phone. */
export function WorkspaceTools({
  locale,
  entries,
  creates,
  openHelp,
  callsEnabled = true,
  hideSearchCreate = false,
}: Readonly<{
  locale: Locale
  entries: readonly NavEntry[]
  creates: ReturnType<typeof createLinks>
  openHelp: () => void
  callsEnabled?: boolean
  hideSearchCreate?: boolean
}>) {
  return (
    <>
      {callsEnabled ? <CallingHeaderAction /> : null}
      {hideSearchCreate ? null : (
        <WorkspaceSearch locale={locale} entries={entries} creates={creates} openHelp={openHelp} />
      )}
      {hideSearchCreate ? null : <CreateMenu links={creates} locale={locale} />}
      <WorkspaceNotifications locale={locale} />
    </>
  )
}
