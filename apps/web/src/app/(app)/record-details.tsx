import { loadRecordDetailsView } from '../../server/queries/crm/record-details'
import { loadWorkspaceLocale } from '../../server/queries/work/read-models'
import { RecordDetailsPanel } from './record-details-panel'

/** The built-in details fields for a CRM record; renders nothing when the record is out of scope. */
export async function RecordDetails({ type, id }: Readonly<{ type: 'organization' | 'contact' | 'lead'; id: string }>) {
  const [view, locale] = await Promise.all([loadRecordDetailsView(type, id), loadWorkspaceLocale()])
  if (view === undefined || view.fields.length === 0) return null
  return <RecordDetailsPanel type={type} id={id} view={view} locale={locale} />
}
