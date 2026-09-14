import type { Metadata } from 'next'
import { saveNotificationPreferences } from '../../../../server/actions/settings'
import { SettingsActionForm } from '../settings-action-form'
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
        <SettingsActionForm
          action={saveNotificationPreferences}
          fixedValues={{
            channels: { assigned: { inApp: true, email: true }, mentioned: { inApp: true, email: false } },
          }}
          fields={[{ name: 'digestLocalTime', label: 'Digest time (HH:mm)' }]}
          initialValues={{ digestLocalTime: '08:00' }}
          submitLabel="Save preferences"
        />
      </SettingsForm>
    </SettingsPage>
  )
}
