/** A field as the card renders it; mirrors the platform `FieldDefinition` subset the UI needs. */
export interface CustomFieldView {
  readonly key: string
  readonly label: string
  readonly type:
    'text' | 'textarea' | 'number' | 'currency' | 'date' | 'select' | 'multiSelect' | 'checkbox' | 'email' | 'url'
  readonly required: boolean
  readonly options: readonly string[]
}

export type CustomFieldValue = string | number | boolean | readonly string[] | null

/** Outcome of saving the card; `fields` holds one message per invalid key. */
export type CustomFieldsSaveResult =
  Readonly<{ ok: true }> | Readonly<{ ok: false; message: string; fields?: Readonly<Record<string, string>> }>

export type CustomFieldsLabels = Readonly<{
  title: string
  edit: string
  save: string
  saving: string
  cancel: string
  empty: string
  yes: string
  no: string
  choose: string
  noDate: string
  clearDate: string
}>
