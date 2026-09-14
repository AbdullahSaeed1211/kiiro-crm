import type { Metadata } from 'next'
import { SettingsForm, SettingsPage } from '../settings-shell'

export const metadata: Metadata = { title: 'Import' }
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
          Download a starter template with core fields and the custom fields configured in this workspace, then upload
          it to the Payload importer (CSV up to 5 MB).
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {['organization', 'contact', 'lead', 'deal', 'project', 'task'].map((recordType) => (
            <a
              className="inline-flex items-center justify-between rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={`/api/v1/import/template/${recordType}`}
              key={recordType}
              download
            >
              <span>
                {recordType.slice(0, 1).toUpperCase()}
                {recordType.slice(1)} template
              </span>
              <span aria-hidden>↓</span>
            </a>
          ))}
        </div>
        <a
          className="inline-flex w-fit rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href="/admin"
        >
          Open Payload Import
        </a>
      </SettingsForm>
    </SettingsPage>
  )
}
