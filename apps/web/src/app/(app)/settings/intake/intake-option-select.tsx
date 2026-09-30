'use client'

import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { CheckboxGroup } from '../checkbox-group'
import type { IntakeOption } from './intake-types'

const inputClass = 'h-10 rounded-md border bg-background px-3 text-sm'

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
  if (multiple) return <CheckboxGroup label={label} options={options} values={values} onChange={onChange} />
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <NativeSelect
        className={inputClass}
        onChange={(event) => {
          onChange(event.currentTarget.value)
        }}
        value={values[0] ?? ''}
      >
        <option value="">None</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </NativeSelect>
    </label>
  )
}
