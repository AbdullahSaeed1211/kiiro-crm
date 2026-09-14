import type { Metadata } from 'next'
import { SettingsForm, SettingRow, SettingsPage } from '../settings-shell'

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
        <div className="flex flex-wrap gap-2">
          {['Leads', 'Deals', 'Tasks', 'Projects'].map((name) => (
            <button className="rounded-md border px-3 py-2 text-sm" key={name} type="button">
              {name}
            </button>
          ))}
        </div>
        {['New', 'In progress', 'Done'].map((stage) => (
          <div className="grid gap-3 sm:grid-cols-[1fr_10rem]" key={stage}>
            <SettingRow label="Stage" value={stage} />
            <SettingRow label="Color" value="#64748B" />
          </div>
        ))}
        <button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" type="button">
          Save workflow
        </button>
      </SettingsForm>
    </SettingsPage>
  )
}
