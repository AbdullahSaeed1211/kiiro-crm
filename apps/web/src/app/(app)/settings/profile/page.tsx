import type { Metadata } from 'next'
import { saveProfile } from '../../../../server/actions/settings'
import { SettingsActionForm } from '../settings-action-form'
import { SettingsForm, SettingsPage } from '../settings-shell'
import { requireRole } from '../../../../server/auth/context'
import { ChangePasswordForm } from '../change-password-form'

export const metadata: Metadata = { title: 'Profile' }
export const dynamic = 'force-dynamic'

export default async function ProfileSettingsPage() {
  const context = await requireRole('owner', 'manager', 'staff')
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
          initialValues={{ name: typeof context.user.name === 'string' ? context.user.name : '' }}
          submitLabel="Save profile"
        />
        <div className="border-t pt-4">
          <h2 className="font-medium">Change password</h2>
          <p className="mt-1 text-sm text-muted-foreground">Rotate your password without leaving your workspace.</p>
          <ChangePasswordForm />
        </div>
      </SettingsForm>
    </SettingsPage>
  )
}
