'use client'

/** A list of checkboxes for choosing several options; replaces a multi-select, which is hard to use on touch screens. */
export function CheckboxGroup({
  label,
  options,
  values,
  disabled = false,
  emptyText,
  onChange,
}: Readonly<{
  label: string
  options: readonly { id: string; name: string }[]
  values: readonly string[]
  disabled?: boolean
  emptyText?: string
  onChange: (values: string[]) => void
}>) {
  const toggle = (id: string, checked: boolean) => {
    onChange(checked ? [...values, id] : values.filter((value) => value !== id))
  }
  return (
    <fieldset className="grid gap-1 text-sm" disabled={disabled}>
      <legend className="font-medium">{label}</legend>
      {options.length === 0 && emptyText !== undefined ? (
        <span className="text-muted-foreground">{emptyText}</span>
      ) : null}
      {options.map((option) => (
        <label key={option.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={values.includes(option.id)}
            onChange={(event) => {
              toggle(option.id, event.target.checked)
            }}
          />
          {option.name}
        </label>
      ))}
    </fieldset>
  )
}
