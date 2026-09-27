import { CUSTOM_FIELD_TYPES, type CustomFieldType, type FieldDefinition } from '@ops/platform'
import type { PayloadRequest } from 'payload'
import { fieldOf, textOf, type Doc } from './documents'
import { findAsUser } from './local-api'

const isFieldType = (value: unknown): value is CustomFieldType =>
  typeof value === 'string' && (CUSTOM_FIELD_TYPES as readonly string[]).includes(value)

function toFieldDefinition(doc: Doc): FieldDefinition | undefined {
  const key = textOf(doc, 'key')
  const type = fieldOf(doc, 'type')
  if (key === undefined || !isFieldType(type)) return undefined
  const options = fieldOf(doc, 'options')
  const position = fieldOf(doc, 'position')
  return {
    key,
    label: textOf(doc, 'label') ?? key,
    type,
    required: fieldOf(doc, 'required') === true,
    options: Array.isArray(options) ? options.filter((item): item is string => typeof item === 'string') : [],
    visibility: fieldOf(doc, 'visibility') === 'manager_up' ? 'manager_up' : 'all',
    sensitive: fieldOf(doc, 'sensitive') === true,
    hidden: fieldOf(doc, 'hidden') === true,
    position: typeof position === 'number' ? position : 0,
  }
}

/** The tenant's field definitions for one record type, as the signed-in user may read them. */
export async function loadFieldDefinitions(req: PayloadRequest, recordType: string): Promise<FieldDefinition[]> {
  const docs = await findAsUser(req, {
    collection: 'fieldDefinitions',
    where: { recordType: { equals: recordType } },
    sort: 'position',
  })
  return docs.flatMap((doc) => toFieldDefinition(doc) ?? [])
}
