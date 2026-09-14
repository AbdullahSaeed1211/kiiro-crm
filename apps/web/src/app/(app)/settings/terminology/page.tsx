import type { Metadata } from 'next'
import { SettingsForm, SettingRow, SettingsPage } from '../settings-shell'

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
        {['Organizations', 'Contacts', 'Leads', 'Deals', 'Projects', 'Tasks'].map((name) => (
          <div className="grid gap-3 sm:grid-cols-3" key={name}>
            <SettingRow label="Record type" value={name} />
            <SettingRow label="Singular" value={name.replace(/s$/, '')} />
            <SettingRow label="Plural" value={name} />
          </div>
        ))}
        <button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" type="button">
          Save terminology
        </button>
      </SettingsForm>
    </SettingsPage>
  )
}
