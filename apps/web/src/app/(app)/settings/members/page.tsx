import type { Metadata } from 'next'
import { SettingsForm, SettingRow, SettingsPage } from '../settings-shell'

export const metadata: Metadata = { title: 'Members · Workspace' }
export const dynamic = 'force-dynamic'

export default function MembersSettingsPage() {
  return (
    <SettingsPage
      title="Members"
      description="Invite teammates and manage workspace access."
      roles={['owner', 'manager']}
    >
      <SettingsForm>
        <div className="grid gap-3 sm:grid-cols-[1fr_10rem_auto]">
          <SettingRow label="Invite by email" value="teammate@example.com" />
          <SettingRow label="Role" value="staff" />
          <button
            className="h-10 self-end rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            type="button"
          >
            Invite
          </button>
        </div>
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          Members, groups, reporting lines, invitations, and activation status appear here.
        </div>
      </SettingsForm>
    </SettingsPage>
  )
}
