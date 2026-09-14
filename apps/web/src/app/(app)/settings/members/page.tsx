import type { Metadata } from 'next'
import { inviteMember } from '../../../../server/actions/settings'
import { InviteMemberForm } from '../member-forms'
import { SettingsForm, SettingsPage } from '../settings-shell'

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
        <InviteMemberForm action={inviteMember} />
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          Members, groups, reporting lines, invitations, and activation status are enforced by the people collection
          access boundary.
        </div>
      </SettingsForm>
    </SettingsPage>
  )
}
