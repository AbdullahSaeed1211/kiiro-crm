import type { CustomFieldType, FieldDefinition } from '@ops/platform'
import type { CrmCustomData } from '../ports/records'

type Converted = { readonly ok: true; readonly value: unknown } | { readonly ok: false; readonly message: string }

const TRUE = /^(?:true|yes|y|1)$/iu
const FALSE = /^(?:false|no|n|0)$/iu

function fail(label: string, expected: string): Converted {
  return { ok: false, message: `${label} must be ${expected}` }
}

const CONVERTERS: Partial<Record<CustomFieldType, (text: string, label: string) => Converted>> = {
  number: (text, label) =>
    Number.isFinite(Number(text)) ? { ok: true, value: Number(text) } : fail(label, 'a number'),
  currency: (text, label) =>
    Number.isFinite(Number(text)) ? { ok: true, value: Number(text) } : fail(label, 'a number'),
  checkbox: (text, label) => {
    if (TRUE.test(text)) return { ok: true, value: true }
    return FALSE.test(text) ? { ok: true, value: false } : fail(label, 'yes or no')
  },
  date: (text, label) =>
    Number.isNaN(Date.parse(text)) ? fail(label, 'a date such as 2026-10-31') : { ok: true, value: Date.parse(text) },
  multiSelect: (text) => ({
    ok: true,
    value: text
      .split(';')
      .map((part) => part.trim())
      .filter((part) => part !== ''),
  }),
}

/** Turns the custom-field cells of one CSV row into stored values, or names the first cell that does not fit its field. */
export function customValues(
  cells: Readonly<Record<string, string>>,
  fields: ReadonlyMap<string, FieldDefinition>,
): { readonly ok: true; readonly data: CrmCustomData } | { readonly ok: false; readonly message: string } {
  const data: Record<string, unknown> = {}
  for (const [key, field] of fields) {
    const text = (cells[key] ?? '').trim()
    if (text === '') continue
    const converted = CONVERTERS[field.type]?.(text, field.label) ?? { ok: true as const, value: text }
    if (!converted.ok) return converted
    data[key] = converted.value
  }
  return { ok: true, data }
}
