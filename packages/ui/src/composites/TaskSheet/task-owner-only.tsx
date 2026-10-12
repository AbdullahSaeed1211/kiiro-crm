'use client'

import { Checkbox } from '@ops/ui/components/ui/checkbox'
import type { TaskChange, TaskSheetLabels, TaskSheetTask } from './types'

/** The owner-only mark, shown only to owners and managers; saves on change. */
export function OwnerOnlyToggle({
  task,
  labels,
  disabled,
  onSave,
}: Readonly<{
  task: TaskSheetTask
  labels: TaskSheetLabels
  disabled: boolean
  onSave: (change: TaskChange) => void
}>) {
  return (
    <label className="flex items-center gap-2 pt-1.5 text-sm">
      <Checkbox
        checked={task.ownerOnly}
        disabled={disabled}
        onCheckedChange={(checked: boolean) => {
          onSave({ kind: 'ownerOnly', ownerOnly: checked })
        }}
      />
      {labels.ownerOnly}
    </label>
  )
}
