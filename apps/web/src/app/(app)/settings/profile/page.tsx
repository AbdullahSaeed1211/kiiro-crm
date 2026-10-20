import type { Metadata } from 'next'
import { saveProfile } from '../../../../server/actions/settings'
import { SettingsActionForm } from '../settings-action-form'
import { SettingsForm, SettingsPage } from '../settings-shell'
import { getWorkspaceSettings, requireRole } from '../../../../server/auth/context'
import { twoFactorEnabled } from '../../../../server/auth/two-factor'
import { listApiTokens } from '../../../../server/auth/api-tokens'
import { calendarTokenOf } from '../../../../server/calendar/feed'
import { ChangePasswordForm } from '../change-password-form'
import { ApiTokensCard } from './api-tokens-card'
import { CalendarFeedCard } from './calendar-feed-card'
import { TwoFactorCard } from './two-factor-card'
import { normalizeLocale } from '../../../../i18n/config'
import { settingText } from '../../../../i18n/settings-form-copy'

export const metadata: Metadata = { title: 'Profile' }
export const dynamic = 'force-dynamic'

export default async function ProfileSettingsPage() {
  const context = await requireRole('owner', 'manager', 'staff')
  const locale = normalizeLocale((await getWorkspaceSettings()).locale)
  const canUseApi = context.actor.role !== 'staff'
  const tokens = canUseApi ? await listApiTokens(context.payload, String(context.user.id)) : []
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
          <h2 className="font-medium">{settingText('Change password', locale)}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {settingText('Rotate your password without leaving your workspace.', locale)}
          </p>
          <ChangePasswordForm />
        </div>
        <div className="border-t pt-4 text-sm">
          <h2 className="font-medium">{settingText('Two-step sign-in', locale)}</h2>
          <p className="mb-3 mt-1 text-muted-foreground">
            {settingText(
              'Ask for a code from an authenticator app after your password, so a stolen password is not enough.',
              locale,
            )}
          </p>
          <TwoFactorCard enabled={enabled} />
        </div>
        <div className="border-t pt-4 text-sm">
          <h2 className="font-medium">{settingText('Calendar feed', locale)}</h2>
          <p className="mb-3 mt-1 text-muted-foreground">
            {settingText('See your task due dates and lead follow-ups in Google, Apple or Outlook Calendar.', locale)}
          </p>
          <CalendarFeedCard hasFeed={hasFeed} />
        </div>
        {canUseApi ? (
          <div className="border-t pt-4 text-sm">
            <h2 className="font-medium">{settingText('API access', locale)}</h2>
            <p className="mb-3 mt-1 text-muted-foreground">
              {settingText(
                "Personal tokens let scripts and tools such as Zapier, Make or n8n use this workspace's API as you.",
                locale,
              )}
            </p>
            <ApiTokensCard tokens={tokens} />
          </div>
        ) : null}
      </SettingsForm>
    </SettingsPage>
  )
}
