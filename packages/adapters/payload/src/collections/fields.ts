import type {
  CollectionConfig,
  CompoundIndex,
  Field,
  JSONField,
  NumberField,
  RelationshipField,
  SelectField,
  TextField,
} from 'payload'
import { SPIKE_ACCESS } from '../access/spike-access'
import { COLLECTIONS, type SpikeCollectionSlug } from '../contracts/names'
import { RECORD_TYPE_VALUES } from './values'

/** Admin navigation groups of spec §17.13. */
export const ADMIN_GROUPS = {
  people: 'People',
  records: 'Records',
  configuration: 'Configuration',
  system: 'System',
} as const

type AdminGroup = (typeof ADMIN_GROUPS)[keyof typeof ADMIN_GROUPS]

/** Column flags shared by the field helpers. */
export interface FieldFlags {
  readonly required?: boolean
  readonly index?: boolean
  readonly unique?: boolean
}

/** Names of the two columns that store a polymorphic record reference (spec §11). */
export interface ReferenceNames {
  readonly type: string
  readonly id: string
}

/** Declarative parts of a spike collection; `spikeCollection` adds access and the §11 persistence rules. */
export interface SpikeCollectionDefinition {
  readonly slug: SpikeCollectionSlug
  readonly admin: NonNullable<CollectionConfig['admin']> & { readonly group: AdminGroup }
  readonly fields: Field[]
  readonly indexes?: CompoundIndex[]
}

/** Builds a collection with the §11.1 access functions of its slug, timestamps on and versions off (spec §11). */
export function spikeCollection(definition: SpikeCollectionDefinition): CollectionConfig {
  return {
    ...definition,
    access: { ...SPIKE_ACCESS[definition.slug] },
    timestamps: true,
    // Activity is the audit trail, so document versions would only duplicate it.
    versions: false,
  }
}

/** Plain text field. */
export function textField(name: string, flags: FieldFlags & { readonly maxLength?: number } = {}): TextField {
  return { name, type: 'text', ...flags }
}

/** Select field whose options are exactly `values`. */
export function selectOf(
  name: string,
  values: readonly string[],
  flags: FieldFlags & { readonly defaultValue?: string } = {},
): SelectField {
  return { name, type: 'select', options: [...values], ...flags }
}

/** Single relationship to one collection; with `idType: 'uuid'` the stored value is the target's UUID string. */
export function relationshipTo(
  name: string,
  relationTo: SpikeCollectionSlug,
  flags: FieldFlags = {},
): RelationshipField {
  return { name, type: 'relationship', relationTo, ...flags }
}

/** Has-many relationship to one collection. */
export function hasManyTo(name: string, relationTo: SpikeCollectionSlug): RelationshipField {
  return { name, type: 'relationship', relationTo, hasMany: true }
}

/** Timestamp stored as UTC epoch milliseconds (decision D-09). */
export function epochMs(name: string, flags: FieldFlags = {}): NumberField {
  return { name, type: 'number', min: 0, admin: { description: 'UTC time in milliseconds since 1970-01-01' }, ...flags }
}

/** Non-negative counter or size. */
export function countField(name: string, flags: FieldFlags = {}): NumberField {
  return { name, type: 'number', min: 0, ...flags }
}

/** Free-form JSON field. */
export function jsonField(name: string, flags: FieldFlags = {}): JSONField {
  return { name, type: 'json', ...flags }
}

/** True when `value` is an array of strings. */
export function isStringList(value: unknown): boolean {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

/** JSON field holding a list of strings, such as email recipients. */
export function stringListField(name: string): JSONField {
  return {
    name,
    type: 'json',
    defaultValue: [],
    validate: (value: unknown) => isStringList(value) || 'Enter a list of text values.',
  }
}

/** Values of custom field definitions (spec §9.3), keyed by field key. */
export function customDataField(): JSONField {
  return jsonField('customData')
}

const RECORD_REFERENCE: ReferenceNames = { type: 'recordType', id: 'recordId' }

/** Polymorphic record reference: a select of the registered record types plus the record id as text (spec §11). */
export function recordReference(flags: FieldFlags = {}, names: ReferenceNames = RECORD_REFERENCE): Field[] {
  return [selectOf(names.type, RECORD_TYPE_VALUES, flags), textField(names.id, flags)]
}

/** Workflow, current stage and stage entry time of a stage-tracked record (spec §9.4). */
export function stageFields(): Field[] {
  return [
    relationshipTo('workflow', COLLECTIONS.workflows),
    textField('stageId', { index: true }),
    epochMs('stageEnteredAt'),
  ]
}
