import type { Metadata } from 'next'
import { saveConfiguration } from '../../../../server/actions/settings'
import { SettingsActionForm } from '../settings-action-form'
import { SettingsForm, SettingsPage } from '../settings-shell'

export const metadata: Metadata = { title: 'Fields · Workspace' }
export const dynamic = 'force-dynamic'

export default function FieldsSettingsPage() {
  return (
    <SettingsPage title="Fields" description="Customize the fields shown on your records." roles={['owner', 'manager']}>
      <SettingsForm>
        <SettingsActionForm
          action={saveConfiguration}
          fixedValues={{ collection: 'fieldDefinitions' }}
          fields={[
            { name: 'recordType', label: 'Record type' },
            { name: 'key', label: 'Field key' },
            { name: 'label', label: 'Field label' },
            { name: 'type', label: 'Field type' },
          ]}
          submitLabel="Add field"
        />
        <div className="flex flex-wrap gap-2">
          {['Organizations', 'Contacts', 'Leads', 'Deals', 'Projects', 'Tasks'].map((name) => (
            <button className="rounded-md border px-3 py-2 text-sm" key={name} type="button">
              {name}
            </button>
          ))}
        </div>
      </SettingsForm>
    </SettingsPage>
  )
}
