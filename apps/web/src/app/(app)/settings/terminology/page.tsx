import type { Metadata } from 'next'
import { saveTerminology } from '../../../../server/actions/settings'
import { SettingsActionForm } from '../settings-action-form'
import { SettingsForm, SettingsPage } from '../settings-shell'

export const metadata: Metadata = { title: 'Terminology · Workspace' }
export const dynamic = 'force-dynamic'

export default function TerminologySettingsPage() {
  return (
    <SettingsPage
      title="Terminology"
      description="Use language that matches how your team works."
      roles={['owner', 'manager']}
    >
      <SettingsForm>
        <SettingsActionForm
          action={saveTerminology}
          fields={[
            { name: 'organization', label: 'Organization' },
            { name: 'contact', label: 'Contact' },
            { name: 'lead', label: 'Lead' },
            { name: 'deal', label: 'Deal' },
            { name: 'project', label: 'Project' },
            { name: 'task', label: 'Task' },
          ]}
          submitLabel="Save terminology"
        />
      </SettingsForm>
    </SettingsPage>
  )
}
