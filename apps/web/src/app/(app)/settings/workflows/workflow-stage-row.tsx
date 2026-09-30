'use client'
/* eslint-disable @typescript-eslint/no-confusing-void-expression, @typescript-eslint/restrict-template-expressions, sonarjs/no-nested-template-literals -- compact row handlers and accessible labels are intentionally colocated. */

import { NativeSelect } from '@ops/ui/components/ui/native-select'
import type { RequirementOption, Stage } from './workflow-model'
import { StageRequirements } from './workflow-stage-requirements'

const CATEGORIES = [
  ['backlog', 'Backlog'],
  ['open', 'Open'],
  ['active', 'Active'],
  ['waiting', 'Waiting'],
  ['done_success', 'Won / done'],
  ['done_failure', 'Lost / failed'],
  ['cancelled', 'Cancelled'],
] as const
const COLORS = ['gray', 'blue', 'green', 'amber', 'red', 'violet', 'teal', 'pink'] as const
const title = (value: string) => `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`

function ProbabilityInput({
  stage,
  onChange,
}: Readonly<{ stage: Stage; onChange: (changes: Partial<Stage>) => void }>) {
  return (
    <label className="grid gap-1 text-xs">
      <span className="font-medium">Probability</span>
      <input
        className="h-9 rounded-md border bg-background px-2"
        type="number"
        min={0}
        max={100}
        value={stage.probability ?? ''}
        onChange={(event) =>
          onChange({ probability: event.target.value === '' ? undefined : Number(event.target.value) })
        }
      />
    </label>
  )
}

export function StageRow({
  stage,
  index,
  onChange,
  onRemove,
  requirementOptions,
}: Readonly<{
  stage: Stage
  index: number
  onChange: (changes: Partial<Stage>) => void
  onRemove: () => void
  requirementOptions: readonly RequirementOption[]
}>) {
  return (
    <div className="grid gap-2 rounded-md border bg-muted/20 p-3 sm:grid-cols-[2rem_minmax(0,1fr)_9rem_8rem_6rem_auto] sm:items-end">
      <span className="pb-2 text-xs font-medium text-muted-foreground" aria-label={`Stage ${index + 1}`}>
        {index + 1}
      </span>
      <label className="grid gap-1 text-xs">
        <span className="font-medium">Name</span>
        <input
          className="h-9 rounded-md border bg-background px-2 text-sm"
          maxLength={60}
          value={stage.name}
          onChange={(event) => onChange({ name: event.target.value })}
        />
      </label>
      <label className="grid gap-1 text-xs">
        <span className="font-medium">Category</span>
        <NativeSelect value={stage.category} onChange={(event) => onChange({ category: event.target.value })}>
          {CATEGORIES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </label>
      <label className="grid gap-1 text-xs">
        <span className="font-medium">Colour</span>
        <NativeSelect value={stage.color} onChange={(event) => onChange({ color: event.target.value })}>
          {COLORS.map((value) => (
            <option key={value} value={value}>
              {title(value)}
            </option>
          ))}
        </NativeSelect>
      </label>
      <ProbabilityInput stage={stage} onChange={onChange} />
      <button
        className="h-9 rounded-md px-2 text-xs text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        type="button"
        aria-label={`Remove ${stage.name || `stage ${index + 1}`}`}
        onClick={onRemove}
      >
        Remove
      </button>
      {requirementOptions.length === 0 ? null : (
        <StageRequirements
          stageName={stage.name}
          options={requirementOptions}
          value={stage.requiredFields ?? []}
          onChange={(requiredFields) => onChange({ requiredFields })}
        />
      )}
    </div>
  )
}
