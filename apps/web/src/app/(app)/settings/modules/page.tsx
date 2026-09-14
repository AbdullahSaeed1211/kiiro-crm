import type { Metadata } from 'next'
import { saveModules } from '../../../../server/actions/settings'
import { SettingsActionForm } from '../settings-action-form'
import { SettingsForm, SettingsPage } from '../settings-shell'

export const metadata: Metadata = { title: 'Modules · Workspace' }
export const dynamic = 'force-dynamic'

export default function ModulesSettingsPage() {
  return (
    <SettingsPage title="Modules" description="Choose which workspace capabilities are available." roles={['owner']}>
      <SettingsForm>
        <SettingsActionForm
          action={saveModules}
          fields={[
            { name: 'crm', label: 'CRM (true or false)' },
            { name: 'work', label: 'Work (true or false)' },
            { name: 'intake', label: 'Intake (true or false)' },
            { name: 'mail', label: 'Mail (true or false)' },
          ]}
          initialValues={{ crm: 'true', work: 'true', intake: 'true', mail: 'true' }}
          submitLabel="Save modules"
        />
      </SettingsForm>
    </SettingsPage>
  )
}
