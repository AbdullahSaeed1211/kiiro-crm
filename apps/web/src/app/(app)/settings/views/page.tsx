import type { Metadata } from 'next'
import { SettingsForm, SettingRow, SettingsPage } from '../settings-shell'

export const metadata: Metadata = { title: 'Views · Workspace' }
export const dynamic = 'force-dynamic'

export default function ViewsSettingsPage() {
  return (
    <SettingsPage title="Views" description="Manage shared views and defaults." roles={['owner', 'manager']}>
      <SettingsForm>
        <SettingRow label="View name" value="Open deals" />
        <SettingRow label="Record type" value="Deals" />
        <div className="flex gap-3">
          <button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" type="button">
            Save view
          </button>
          <button className="h-10 rounded-md border px-4 text-sm" type="button">
            Delete
          </button>
        </div>
      </SettingsForm>
    </SettingsPage>
  )
}
