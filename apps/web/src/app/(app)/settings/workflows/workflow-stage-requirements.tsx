'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ops/ui/components/ui/select'
import type { WorkflowCopy } from '../../../../i18n/workflow-copy'
import type { RequirementOption } from './workflow-model'

/** Picks the fields a record must have filled in before it can enter this stage. */
export function StageRequirements({
  stageName,
  options,
  value,
  copy,
  onChange,
}: Readonly<{
  stageName: string
  options: readonly RequirementOption[]
  value: readonly string[]
  copy: WorkflowCopy
  onChange: (value: string[]) => void
}>) {
  const labels = new Map(options.map((option) => [option.key, option.label]))
  return (
    <label className="grid gap-1 text-xs">
      <span className="font-medium">{copy.requiredBefore}</span>
      <Select
        multiple
        value={[...value]}
        onValueChange={(next: string[]) => {
          onChange(next)
        }}
      >
        <SelectTrigger size="sm" aria-label={copy.requiredFor.replace('{name}', stageName)} className="w-full">
          <SelectValue>
            {(selected: string[]) =>
              selected.length === 0 ? copy.nothingRequired : selected.map((key) => labels.get(key) ?? key).join(', ')
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
