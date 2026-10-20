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
  maxLength?: number
  placeholder?: string
  description?: string
  options?: readonly SelectOption[]
  disabled?: boolean
  /** On screens wider than a phone, this field shares a row with the next one that is also `half`. */
  half?: boolean
  inputMode?: 'text' | 'email' | 'tel' | 'url' | 'numeric' | 'decimal'
}>

export type RecordFormValues = Readonly<Record<string, FormValue | undefined>>

/** Values keyed by field config, with missing values represented by an empty string. */
export function formValues(fields: readonly RecordFieldConfig[], values: RecordFormValues): Record<string, FormValue> {
  return Object.fromEntries(fields.map((field) => [field.name, values[field.name] ?? '']))
}

/** True for text shaped like an address: something, one `@`, then a domain with a dot inside it. */
function looksLikeEmail(text: string): boolean {
  const at = text.indexOf('@')
  const domain = text.slice(at + 1)
  const dot = domain.lastIndexOf('.')
  return at > 0 && !/\s/.test(text) && !domain.includes('@') && dot > 0 && dot < domain.length - 1
}

/** An address typed into an email field must look like one; a blank field is left to the required check. */
export function validateEmails(
  fields: readonly RecordFieldConfig[],
  values: RecordFormValues,
  message: string,
): Readonly<Record<string, string>> {
  const errors: Record<string, string> = {}
  for (const field of fields) {
    if (field.type !== 'email') continue
    const value = String(values[field.name] ?? '').trim()
    if (value !== '' && !looksLikeEmail(value)) errors[field.name] = message
  }
  return errors
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
