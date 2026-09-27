import { domainError, err, ok, type Result } from '@ops/kernel'
import type { Actor } from '../contracts/access'
import { isManagerUp } from '../permissions/policy'

/** Value types a tenant can give a custom field (spec §9.3). */
export const CUSTOM_FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'currency',
  'date',
  'select',
  'multiSelect',
  'checkbox',
  'email',
  'url',
] as const
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number]

/** A tenant-defined field on one record type. */
export interface FieldDefinition {
  readonly key: string
  readonly label: string
  readonly type: CustomFieldType
  readonly required: boolean
  readonly options: readonly string[]
  readonly visibility: 'all' | 'manager_up'
  readonly sensitive: boolean
  readonly hidden: boolean
  readonly position: number
}

/** A stored custom value: text, number, epoch-ms date, boolean, a list of options, or cleared. */
export type CustomValue = string | number | boolean | readonly string[] | null

/** Definitions the actor may see and edit, in position order; manager-only and sensitive fields need manager_up. */
export function visibleFields(definitions: readonly FieldDefinition[], actor: Actor): FieldDefinition[] {
  const privileged = isManagerUp(actor)
  return definitions
    .filter((field) => !field.hidden && (privileged || (field.visibility === 'all' && !field.sensitive)))
    .toSorted((a, b) => a.position - b.position || a.label.localeCompare(b.label))
}

/** One `@`, no spaces, and a dotted domain; the mail provider does the real validation. */
function looksLikeEmail(value: string): boolean {
  const [local, domain, extra] = value.split('@')
  if (extra !== undefined || local === undefined || domain === undefined || /\s/u.test(value)) return false
  const dot = domain.lastIndexOf('.')
  return local !== '' && dot > 0 && dot < domain.length - 1
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)
}

function parseUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

type Checked = Readonly<{ ok: true; value: CustomValue }> | Readonly<{ ok: false; message: string }>
type Check = (value: unknown, field: FieldDefinition) => Checked

const valid = (value: CustomValue): Checked => ({ ok: true, value })
const invalid = (message: string): Checked => ({ ok: false, message })

const text: Check = (value) => (typeof value === 'string' ? valid(value.trim()) : invalid('Enter text.'))
const numeric: Check = (value) => {
  const number = typeof value === 'string' ? Number(value) : value
  return typeof number === 'number' && Number.isFinite(number) ? valid(number) : invalid('Enter a number.')
}

const CHECKS: Readonly<Record<CustomFieldType, Check>> = {
  text,
  textarea: text,
  number: numeric,
  currency: numeric,
  date: (value) => (typeof value === 'number' && Number.isFinite(value) ? valid(value) : invalid('Choose a date.')),
  checkbox: (value) => (typeof value === 'boolean' ? valid(value) : invalid('Choose yes or no.')),
  email: (value) =>
    typeof value === 'string' && looksLikeEmail(value.trim())
      ? valid(value.trim().toLowerCase())
      : invalid('Enter an email address.'),
  url: (value) =>
    typeof value === 'string' && parseUrl(value.trim())
      ? valid(value.trim())
      : invalid('Enter a web address starting with https://.'),
  select: (value, field) =>
    typeof value === 'string' && field.options.includes(value)
      ? valid(value)
      : invalid('Choose one of the listed options.'),
  multiSelect: (value, field) =>
    Array.isArray(value) && value.every((item) => typeof item === 'string' && field.options.includes(item))
      ? valid(value as string[])
      : invalid('Choose from the listed options.'),
}

function checkValue(field: FieldDefinition, value: unknown): Checked {
  if (!isEmpty(value)) return CHECKS[field.type](value, field)
  return field.required ? invalid(`${field.label} is required.`) : valid(null)
}

/**
 * Validates a partial set of custom values against the fields the actor may edit. Unknown or not-visible keys,
 * wrong types and emptied required fields are reported per key; empty values clear the field.
 */
export function validateCustomValues(
  fields: readonly FieldDefinition[],
  values: Readonly<Record<string, unknown>>,
): Result<Record<string, CustomValue>> {
  const byKey = new Map(fields.map((field) => [field.key, field]))
  const errors: Record<string, string> = {}
  const clean: Record<string, CustomValue> = {}
  for (const [key, value] of Object.entries(values)) {
    const field = byKey.get(key)
    const checked =
      field === undefined ? invalid('This field does not exist or you cannot edit it.') : checkValue(field, value)
    if (checked.ok) clean[key] = checked.value
    else errors[key] = checked.message
  }
  if (Object.keys(errors).length > 0)
    return err(domainError('VALIDATION', 'Some custom fields are invalid.', { fields: errors }))
  return ok(clean)
}
