import type { Metadata } from 'next'
import { deleteConfiguration, saveConfiguration } from '../../../../server/actions/settings/configuration'
import { getWorkspaceSettings, requireRole } from '../../../../server/auth/context'
import { SettingsForm, SettingsPage } from '../settings-shell'
import { FieldDefinitionEditor } from './field-definition-editor'
import { catalogFor } from '../../../../i18n/locale'
import { FIELDS_COPY } from '../../../../i18n/fields-copy'

export const metadata: Metadata = { title: 'Fields' }
export const dynamic = 'force-dynamic'

const stringValue = (value: unknown, fallback = ''): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : fallback
const stringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

export default async function FieldsSettingsPage() {
  const context = await requireRole('owner', 'manager')
  const copy = catalogFor(FIELDS_COPY, (await getWorkspaceSettings()).locale)
  const result = await context.payload.find({
    collection: 'fieldDefinitions',
    sort: 'recordType',
    pagination: false,
    depth: 0,
    req: context.req,
  })
  const fields = result.docs.map((doc) => ({
    id: doc.id,
    recordType: stringValue(doc.recordType, 'contact'),
    key: stringValue(doc.key),
    label: stringValue(doc.label),
    type: stringValue(doc.type, 'text'),
    required: doc.required === true,
    options: stringList(doc.options),
    visibility: stringValue(doc.visibility, 'all'),
    sensitive: doc.sensitive === true,
    hidden: doc.hidden === true,
    position: typeof doc.position === 'number' ? doc.position : 0,
  }))
  return (
    <SettingsPage title="Fields" description="Customize the fields shown on your records." roles={['owner', 'manager']}>
      <SettingsForm>
        <p className="text-sm text-muted-foreground">{copy.intro}</p>
        <FieldDefinitionEditor fields={fields} action={saveConfiguration} deleteAction={deleteConfiguration} />
      </SettingsForm>
    </SettingsPage>
  )
}
