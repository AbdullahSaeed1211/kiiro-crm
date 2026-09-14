import type { Metadata } from 'next'
import { saveGroup } from '../../../../server/actions/settings'
import { GroupForm } from '../member-forms'
import { SettingsForm, SettingsPage } from '../settings-shell'

export const metadata: Metadata = { title: 'Groups · Workspace' }
export const dynamic = 'force-dynamic'

export default function GroupsSettingsPage() {
  return (
    <SettingsPage title="Groups" description="Organize members into reusable teams." roles={['owner', 'manager']}>
      <SettingsForm>
        <GroupForm action={saveGroup} />
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          Group membership remains subject to manager and owner access.
        </div>
      </SettingsForm>
    </SettingsPage>
  )
}
