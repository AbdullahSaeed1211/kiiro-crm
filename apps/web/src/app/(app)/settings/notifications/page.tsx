import type { Metadata } from 'next'
import { saveNotificationPreferences } from '../../../../server/actions/settings'
import { requireRole } from '../../../../server/auth/context'
import { SettingsForm, SettingsPage } from '../settings-shell'
import { NotificationSettingsForm } from './notification-settings-form'

export const metadata: Metadata = { title: 'Notifications' }
export const dynamic = 'force-dynamic'

export default async function NotificationsSettingsPage() {
  const context = await requireRole('owner', 'manager', 'staff')
  const result = await context.payload.find({
    collection: 'notificationPrefs',
    where: { user: { equals: context.actor.id } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    req: context.req,
  })
  const preference = result.docs.at(0)
  const channels =
    typeof preference?.channels === 'object' && preference.channels !== null
      ? (preference.channels as Record<string, unknown>)
      : {}
  const digestLocalTime = typeof preference?.digestLocalTime === 'string' ? preference.digestLocalTime : '08:00'
  return (
    <SettingsPage
      title="Notifications"
      description="Choose which workspace updates reach you and where they appear."
      roles={['owner', 'manager', 'staff']}
    >
      <SettingsForm>
        <NotificationSettingsForm
          action={saveNotificationPreferences}
          channels={channels}
          digestLocalTime={digestLocalTime}
        />
      </SettingsForm>
    </SettingsPage>
  )
}
