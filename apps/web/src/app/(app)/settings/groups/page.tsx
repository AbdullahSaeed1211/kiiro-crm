import type { Metadata } from 'next'
import { deleteGroup, saveGroup } from '../../../../server/actions/settings'
import { GroupForm, GroupList } from '../member-forms'
import { SettingsForm, SettingsPage } from '../settings-shell'
import { requireRole } from '../../../../server/auth/context'

export const metadata: Metadata = { title: 'Groups' }
export const dynamic = 'force-dynamic'

export default async function GroupsSettingsPage() {
  const context = await requireRole('owner', 'manager')
  const groups = await context.payload.find({
    collection: 'groups',
    sort: 'name',
    pagination: false,
    depth: 0,
    req: context.req,
  })
  return (
    <SettingsPage title="Groups" description="Organize members into reusable teams." roles={['owner', 'manager']}>
      <SettingsForm>
        <GroupForm action={saveGroup} />
        <GroupList
          groups={groups.docs.map((group) => ({ id: group.id, name: group.name }))}
          action={saveGroup}
          deleteAction={deleteGroup}
        />
      </SettingsForm>
    </SettingsPage>
  )
}
