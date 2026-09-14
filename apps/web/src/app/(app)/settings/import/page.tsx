import type { Metadata } from 'next'
import { SettingsForm, SettingsPage } from '../settings-shell'

export const metadata: Metadata = { title: 'Import · Workspace' }
export const dynamic = 'force-dynamic'

export default function ImportSettingsPage() {
  return (
    <SettingsPage
      title="Import"
      description="Prepare CSV data and send it through the Payload importer."
      roles={['owner', 'manager']}
    >
      <SettingsForm>
        <p className="text-sm text-muted-foreground">
          Download a template for each record type, fill it in, and import files up to 5 MB.
        </p>
        <div className="flex flex-wrap gap-2">
          {['Organizations', 'Contacts', 'Leads', 'Projects', 'Tasks'].map((name) => (
            <a className="rounded-md border px-3 py-2 text-sm" href="/admin" key={name}>
              Open importer for {name}
            </a>
          ))}
        </div>
        <a className="text-sm underline underline-offset-4" href="/admin">
          Open Payload Import
        </a>
      </SettingsForm>
    </SettingsPage>
  )
}
