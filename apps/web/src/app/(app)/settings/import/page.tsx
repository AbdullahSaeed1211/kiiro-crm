import type { Metadata } from 'next'
import { getWorkspaceSettings } from '../../../../server/auth/context'
import { catalogFor, fill } from '../../../../i18n/locale'
import { IMPORT_COPY } from '../../../../i18n/import-copy'
import { SettingsForm, SettingsPage } from '../settings-shell'
import { ImportForm } from './import-form'

export const metadata: Metadata = { title: 'Import' }
export const dynamic = 'force-dynamic'

const TEMPLATES = ['organization', 'contact', 'lead'] as const

/** Export file slug, and the record type whose name labels it. */
const EXPORTS = [
  ['organizations', 'organization'],
  ['contacts', 'contact'],
  ['leads', 'lead'],
  ['deals', 'deal'],
] as const

const IMPORT_TYPES = ['organization', 'contact', 'lead'] as const

export default async function ImportSettingsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ readonly type?: string }> }>) {
  const [{ type: requested }, settings] = await Promise.all([searchParams, getWorkspaceSettings()])
  const copy = catalogFor(IMPORT_COPY, settings.locale)
  const initialType = IMPORT_TYPES.find((type) => type === requested) ?? 'contact'
  return (
    <SettingsPage
      title="Import & export"
      description="Bring organizations, contacts, leads and deals in from a spreadsheet, or download everything as CSV."
      roles={['owner', 'manager']}
    >
      <SettingsForm>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          {copy.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((recordType) => (
            <a
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={`/api/v1/import/template/${recordType}`}
              key={recordType}
              download
            >
              {fill(copy.template, { name: copy.typeSingular[recordType] ?? recordType })} <span aria-hidden>↓</span>
            </a>
          ))}
        </div>
      </SettingsForm>
      <SettingsForm>
        <ImportForm initialType={initialType} />
      </SettingsForm>
      <SettingsForm>
        <h2 className="text-sm font-medium">{copy.exportTitle}</h2>
        <p className="text-sm text-muted-foreground">{copy.exportHelp}</p>
        <div className="flex flex-wrap gap-2">
          {EXPORTS.map(([slug, recordType]) => (
            <a
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={`/api/v1/export/${slug}`}
              key={slug}
              download
            >
              {copy.types[recordType]} <span aria-hidden>↓</span>
            </a>
          ))}
        </div>
      </SettingsForm>
    </SettingsPage>
  )
}
