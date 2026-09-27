'use client'

import type { ChangeEvent } from 'react'
import type { IntakeOption } from './intake-types'

const inputClass = 'h-10 rounded-md border bg-background px-3 text-sm'

function selectedValues(event: ChangeEvent<HTMLSelectElement>): string[] {
  return Array.from(event.currentTarget.selectedOptions, (option) => option.value)
}

export function OptionSelect({
  label,
  options,
  value,
  multiple = false,
  onChange,
}: Readonly<{
  label: string
  options: readonly IntakeOption[]
  value: string | readonly string[]
  multiple?: boolean
  onChange: (value: string | string[]) => void
}>) {
  const values: string[] = typeof value === 'string' ? [value] : [...value]
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <select
        className={`${inputClass}${multiple ? ' min-h-24 py-2' : ''}`}
        multiple={multiple}
        onChange={(event) => {
          onChange(multiple ? selectedValues(event) : event.currentTarget.value)
        }}
        value={multiple ? values : (values[0] ?? '')}
      >
        {!multiple && <option value="">None</option>}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      {multiple && <span className="text-xs text-muted-foreground">Hold Cmd/Ctrl to select more than one.</span>}
    </label>
  )
}
