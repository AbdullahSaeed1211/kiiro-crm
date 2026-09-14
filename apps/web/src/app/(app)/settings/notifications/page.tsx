import type { Metadata } from 'next'
import { SettingsForm, SettingsPage } from '../settings-shell'

export const metadata: Metadata = { title: 'Notifications · Workspace' }
export const dynamic = 'force-dynamic'

export default function NotificationsSettingsPage() {
  return (
    <SettingsPage
      title="Notifications"
      description="Choose how you receive updates."
      roles={['owner', 'manager', 'staff']}
    >
      <SettingsForm>
        {['Tasks assigned to me', 'Mentions', 'New leads', 'Comments'].map((name) => (
          <div className="flex items-center justify-between rounded-lg border p-4 text-sm" key={name}>
            <span>{name}</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input defaultChecked type="checkbox" /> In-app
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" /> Email
              </label>
            </div>
          </div>
        ))}
        <button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" type="button">
          Save preferences
        </button>
      </SettingsForm>
    </SettingsPage>
  )
}
