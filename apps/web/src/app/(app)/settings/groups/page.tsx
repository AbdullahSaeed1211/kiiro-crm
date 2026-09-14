import type { Metadata } from 'next'
import { SettingsForm, SettingRow, SettingsPage } from '../settings-shell'

export const metadata: Metadata = { title: 'Groups · Workspace' }
export const dynamic = 'force-dynamic'

export default function GroupsSettingsPage() {
  return (
    <SettingsPage title="Groups" description="Organize members into reusable teams." roles={['owner', 'manager']}>
      <SettingsForm>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <SettingRow label="New group" value="Sales" />
          <button
            className="h-10 self-end rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            type="button"
          >
            Create group
          </button>
        </div>
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          Create groups and manage their members from this page.
        </div>
      </SettingsForm>
    </SettingsPage>
  )
}
