export type FormValue = string | number | null

export interface SelectOption {
  readonly value: string
  readonly label: string
}

export type RecordFieldConfig = Readonly<{
  name: string
  label: string
  type?: 'text' | 'email' | 'tel' | 'url' | 'number' | 'textarea' | 'select'
  required?: boolean
  placeholder?: string
  description?: string
  options?: readonly SelectOption[]
  disabled?: boolean
  inputMode?: 'text' | 'email' | 'tel' | 'url' | 'numeric' | 'decimal'
}>

export type RecordFormValues = Readonly<Record<string, FormValue | undefined>>

/** Values keyed by field config, with missing values represented by an empty string. */
export function formValues(fields: readonly RecordFieldConfig[], values: RecordFormValues): Record<string, FormValue> {
  return Object.fromEntries(fields.map((field) => [field.name, values[field.name] ?? '']))
}

/** Pure required-field validation; presentation and server validation remain the caller's responsibility. */
export function validateRequired(
  fields: readonly RecordFieldConfig[],
  values: RecordFormValues,
  message: string,
): Readonly<Record<string, string>> {
  const errors: Record<string, string> = {}
  for (const field of fields) {
    if (!field.required) continue
    const value = values[field.name]
    if (value === null || value === undefined || String(value).trim() === '') errors[field.name] = message
  }
  return errors
}
