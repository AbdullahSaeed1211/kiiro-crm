'use client'

import { Input } from '@ops/ui/components/ui/input'

export function NumberSetting({
  label,
  min,
  max,
  value,
  onChange,
}: Readonly<{ label: string; min: number; max: number; value: number; onChange: (value: number) => void }>) {
  return (
    <label className="grid gap-1 text-sm">
      <span>{label}</span>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => {
          onChange(Number(event.target.value))
        }}
      />
    </label>
  )
}
