import type { Metadata } from 'next'
import { saveConfiguration } from '../../../../server/actions/settings'
import { SettingsActionForm } from '../settings-action-form'
import { SettingsForm, SettingsPage } from '../settings-shell'

export const metadata: Metadata = { title: 'Workflows · Workspace' }
export const dynamic = 'force-dynamic'

export default function WorkflowsSettingsPage() {
  return (
    <SettingsPage
      title="Workflows"
      description="Define stages and defaults for each record type."
      roles={['owner', 'manager']}
    >
      <SettingsForm>
        <SettingsActionForm
          action={saveConfiguration}
          fixedValues={{ collection: 'workflows' }}
          fields={[
            { name: 'recordType', label: 'Record type' },
            { name: 'name', label: 'Workflow name' },
            { name: 'defaultStageId', label: 'Default stage' },
          ]}
          submitLabel="Save workflow"
        />
      </SettingsForm>
    </SettingsPage>
  )
}
