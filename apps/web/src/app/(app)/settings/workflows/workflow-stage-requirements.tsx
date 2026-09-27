'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ops/ui/components/ui/select'
import type { RequirementOption } from './workflow-model'

/** Picks the fields a record must have filled in before it can enter this stage. */
export function StageRequirements({
  stageName,
  options,
  value,
  onChange,
}: Readonly<{
  stageName: string
  options: readonly RequirementOption[]
  value: readonly string[]
  onChange: (value: string[]) => void
}>) {
  const labels = new Map(options.map((option) => [option.key, option.label]))
  return (
    <label className="grid gap-1 text-xs sm:col-span-full">
      <span className="font-medium">Required before entering</span>
      <Select
        multiple
        value={[...value]}
        onValueChange={(next: string[]) => {
          onChange(next)
        }}
      >
        <SelectTrigger size="sm" aria-label={`Required fields for ${stageName || 'this stage'}`} className="w-full">
          <SelectValue>
            {(selected: string[]) =>
              selected.length === 0 ? 'Nothing required' : selected.map((key) => labels.get(key) ?? key).join(', ')
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="start" alignItemWithTrigger={false}>
          {options.map((option) => (
            <SelectItem key={option.key} value={option.key}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}
