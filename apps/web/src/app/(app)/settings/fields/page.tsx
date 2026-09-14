import type { Metadata } from 'next'
import { SettingsForm, SettingRow, SettingsPage } from '../settings-shell'

export const metadata: Metadata = { title: 'Fields · Workspace' }
export const dynamic = 'force-dynamic'

export default function FieldsSettingsPage() {
  return (
    <SettingsPage title="Fields" description="Customize the fields shown on your records." roles={['owner', 'manager']}>
      <SettingsForm>
        <div className="flex flex-wrap gap-2">
          {['Organizations', 'Contacts', 'Leads', 'Deals', 'Projects', 'Tasks'].map((name) => (
            <button className="rounded-md border px-3 py-2 text-sm" key={name} type="button">
              {name}
            </button>
          ))}
        </div>
        <SettingRow label="New field label" value="Customer tier" />
        <SettingRow label="Field type" value="select" />
        <button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" type="button">
          Add field
        </button>
      </SettingsForm>
    </SettingsPage>
  )
}
