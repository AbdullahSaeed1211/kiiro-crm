import type { Metadata } from 'next'
import { SettingsForm, SettingsPage } from '../settings-shell'
import { ImportForm } from './import-form'

export const metadata: Metadata = { title: 'Import' }
export const dynamic = 'force-dynamic'

const TEMPLATES = [
  ['organization', 'Organizations'],
  ['contact', 'Contacts'],
  ['lead', 'Leads'],
] as const

export default function ImportSettingsPage() {
  return (
    <SettingsPage
      title="Import"
      description="Bring organizations, contacts and leads in from a spreadsheet."
      roles={['owner', 'manager']}
    >
      <SettingsForm>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Download the template for what you are importing and fill it in (CSV, up to 5 MB and 500 rows).</li>
          <li>Choose the file and press Check file. Nothing is saved; every row is checked and problems are listed.</li>
          <li>When the check looks right, press Import. People and companies that already exist are skipped.</li>
        </ol>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map(([recordType, label]) => (
            <a
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={`/api/v1/import/template/${recordType}`}
              key={recordType}
              download
            >
              {label} template <span aria-hidden>↓</span>
            </a>
          ))}
        </div>
      </SettingsForm>
      <SettingsForm>
        <ImportForm />
      </SettingsForm>
    </SettingsPage>
  )
}
