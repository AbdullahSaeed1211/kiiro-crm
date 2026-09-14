import type { Metadata } from 'next'
import { saveProfile } from '../../../../server/actions/settings'
import { SettingsActionForm } from '../settings-action-form'
import { SettingsForm, SettingsPage } from '../settings-shell'

export const metadata: Metadata = { title: 'Profile · Workspace' }
export const dynamic = 'force-dynamic'

export default function ProfileSettingsPage() {
  return (
    <SettingsPage
      title="Profile"
      description="Manage your personal details and password."
      roles={['owner', 'manager', 'staff']}
    >
      <SettingsForm>
        <SettingsActionForm
          action={saveProfile}
          fields={[{ name: 'name', label: 'Name' }]}
          submitLabel="Save profile"
        />
        <div className="border-t pt-4">
          <h2 className="font-medium">Change password</h2>
          <p className="mt-1 text-sm text-muted-foreground">Use the secure password form to rotate your password.</p>
          <a className="mt-3 inline-block text-sm underline underline-offset-4" href="/login">
            Open password flow
          </a>
        </div>
      </SettingsForm>
    </SettingsPage>
  )
}
