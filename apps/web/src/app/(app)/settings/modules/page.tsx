import type { Metadata } from 'next'
import { SettingsForm, SettingsPage } from '../settings-shell'

export const metadata: Metadata = { title: 'Modules · Workspace' }
export const dynamic = 'force-dynamic'

export default function ModulesSettingsPage() {
  return (
    <SettingsPage title="Modules" description="Choose which workspace capabilities are available." roles={['owner']}>
      <SettingsForm>
        {['CRM', 'Work', 'Intake', 'Mail'].map((name) => (
          <label className="flex items-center justify-between rounded-lg border p-4 text-sm" key={name}>
            <span>
              <span className="block font-medium">{name}</span>
              <span className="text-muted-foreground">Available to workspace members</span>
            </span>
            <input defaultChecked type="checkbox" />
          </label>
        ))}
        <button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" type="button">
          Save modules
        </button>
      </SettingsForm>
    </SettingsPage>
  )
}
