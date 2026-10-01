import type { Metadata } from 'next'
import { saveProfile } from '../../../../server/actions/settings'
import { SettingsActionForm } from '../settings-action-form'
import { SettingsForm, SettingsPage } from '../settings-shell'
import { requireRole } from '../../../../server/auth/context'
import { twoFactorEnabled } from '../../../../server/auth/two-factor'
import { calendarTokenOf } from '../../../../server/calendar/feed'
import { ChangePasswordForm } from '../change-password-form'
import { CalendarFeedCard } from './calendar-feed-card'
import { TwoFactorCard } from './two-factor-card'

export const metadata: Metadata = { title: 'Profile' }
export const dynamic = 'force-dynamic'

export default async function ProfileSettingsPage() {
  const context = await requireRole('owner', 'manager', 'staff')
  const hasFeed = (await calendarTokenOf(context.payload, String(context.user.id))) !== null
  const enabled = await twoFactorEnabled({
    payload: context.payload,
    req: context.req,
    userId: String(context.user.id),
  })
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
        <div className="border-t pt-4 text-sm">
          <h2 className="font-medium">Two-step sign-in</h2>
          <p className="mb-3 mt-1 text-muted-foreground">
            Ask for a code from an authenticator app after your password, so a stolen password is not enough.
          </p>
          <TwoFactorCard enabled={enabled} />
        </div>
        <div className="border-t pt-4 text-sm">
          <h2 className="font-medium">Calendar feed</h2>
          <p className="mb-3 mt-1 text-muted-foreground">
            See your task due dates and lead follow-ups in Google, Apple or Outlook Calendar.
          </p>
          <CalendarFeedCard hasFeed={hasFeed} />
        </div>
      </SettingsForm>
    </SettingsPage>
  )
}
