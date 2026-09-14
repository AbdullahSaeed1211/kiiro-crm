import type { Metadata } from 'next'
import { saveConfiguration } from '../../../../server/actions/settings'
import { SettingsActionForm } from '../settings-action-form'
import { SettingsForm, SettingsPage } from '../settings-shell'

export const metadata: Metadata = { title: 'Views · Workspace' }
export const dynamic = 'force-dynamic'

export default function ViewsSettingsPage() {
  return (
    <SettingsPage title="Views" description="Manage shared views and defaults." roles={['owner', 'manager']}>
      <SettingsForm>
        <SettingsActionForm
          action={saveConfiguration}
          fixedValues={{ collection: 'savedViews' }}
          fields={[
            { name: 'recordType', label: 'Record type' },
            { name: 'name', label: 'View name' },
            { name: 'kind', label: 'View kind' },
          ]}
          submitLabel="Save view"
        />
      </SettingsForm>
    </SettingsPage>
  )
}
