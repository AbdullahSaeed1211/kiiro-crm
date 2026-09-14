import type { Metadata } from 'next'
import { SettingsForm, SettingRow, SettingsPage } from '../settings-shell'

export const metadata: Metadata = { title: 'General · Workspace' }
export const dynamic = 'force-dynamic'

export default function GeneralSettingsPage() {
  return (
    <SettingsPage
      title="General"
      description="Workspace defaults and regional preferences."
      roles={['owner', 'manager']}
    >
      <SettingsForm>
        <SettingRow label="Workspace name" value="Workspace" />
        <SettingRow label="Time zone" value="UTC" />
        <SettingRow label="Locale" value="en" />
        <SettingRow label="Currency" value="USD" />
        <SettingRow label="Stalled after (days)" value="14" />
        <button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" type="button">
          Save changes
        </button>
      </SettingsForm>
    </SettingsPage>
  )
}
