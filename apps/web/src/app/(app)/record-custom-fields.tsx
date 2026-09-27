import type { CrmRecordType } from '@ops/module-crm'
import { loadCustomFieldsView } from '../../server/queries/crm/custom-fields'
import { loadWorkspaceLocale } from '../../server/queries/work/read-models'
import { RecordCustomFieldsPanel } from './record-custom-fields-panel'

/** The tenant's custom fields for a CRM record; renders nothing when the record type has none the actor may see. */
export async function RecordCustomFields({ type, id }: Readonly<{ type: CrmRecordType; id: string }>) {
  const [view, locale] = await Promise.all([loadCustomFieldsView(type, id), loadWorkspaceLocale()])
  if (view === undefined || view.fields.length === 0) return null
  return <RecordCustomFieldsPanel type={type} id={id} view={view} locale={locale} />
}
