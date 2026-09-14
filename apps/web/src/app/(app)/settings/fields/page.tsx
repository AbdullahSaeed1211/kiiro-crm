import type { Metadata } from 'next'
import { deleteConfiguration, saveConfiguration } from '../../../../server/actions/settings'
import { requireRole } from '../../../../server/auth/context'
import { SettingsForm, SettingsPage } from '../settings-shell'
import { FieldDefinitionEditor } from './field-definition-editor'

export const metadata: Metadata = { title: 'Fields' }
export const dynamic = 'force-dynamic'

const stringValue = (value: unknown, fallback = ''): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : fallback
const stringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

export default async function FieldsSettingsPage() {
  const context = await requireRole('owner', 'manager')
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
        <p className="text-sm text-muted-foreground">
          Add business-specific fields once and reuse them across forms and record pages. Hidden and sensitive fields
          remain governed by workspace roles.
        </p>
        <FieldDefinitionEditor fields={fields} action={saveConfiguration} deleteAction={deleteConfiguration} />
      </SettingsForm>
    </SettingsPage>
  )
}
