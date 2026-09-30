'use client'

import { NativeSelect } from '@ops/ui/components/ui/native-select'
import type { RequirementOption, Stage } from './workflow-model'
import { StageRequirements } from './workflow-stage-requirements'
import { CATEGORIES, COLORS } from './stage-constants'
import { title } from './workflow-model'

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
        onChange={(event) => {
          onChange({
            probability: event.target.value === '' ? undefined : Number(event.target.value),
          })
        }}
      />
    </label>
  )
}

function StageName({ value, onChange }: Readonly<{ value: string; onChange: (value: string) => void }>) {
  return (
    <label className="grid gap-1 text-xs">
      <span className="font-medium">Name</span>
      <input
        className="h-9 rounded-md border bg-background px-2 text-sm"
        maxLength={60}
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
        }}
      />
    </label>
  )
}

function StageCategory({ value, onChange }: Readonly<{ value: string; onChange: (value: string) => void }>) {
  return (
    <label className="grid gap-1 text-xs">
      <span className="font-medium">Category</span>
      <NativeSelect
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
        }}
      >
        {CATEGORIES.map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </NativeSelect>
    </label>
  )
}

function StageColor({ value, onChange }: Readonly<{ value: string; onChange: (value: string) => void }>) {
  return (
    <label className="grid gap-1 text-xs">
      <span className="font-medium">Colour</span>
      <NativeSelect
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
        }}
      >
        {COLORS.map((v) => (
          <option key={v} value={v}>
            {title(v)}
          </option>
        ))}
      </NativeSelect>
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
  const stageNumber = String(index + 1)
  const removeLabel = stage.name ? `Remove ${stage.name}` : `Remove stage ${stageNumber}`

  return (
    <div className="grid gap-2 rounded-md border bg-muted/20 p-3 sm:grid-cols-[2rem_minmax(0,1fr)_9rem_8rem_6rem_auto] sm:items-end">
      <span className="pb-2 text-xs font-medium text-muted-foreground" aria-label={`Stage ${stageNumber}`}>
        {stageNumber}
      </span>
      <StageName
        value={stage.name}
        onChange={(value) => {
          onChange({ name: value })
        }}
      />
      <StageCategory
        value={stage.category}
        onChange={(value) => {
          onChange({ category: value })
        }}
      />
      <StageColor
        value={stage.color}
        onChange={(value) => {
          onChange({ color: value })
        }}
      />
      <ProbabilityInput stage={stage} onChange={onChange} />
      <button
        className="h-9 rounded-md px-2 text-xs text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        type="button"
        aria-label={removeLabel}
        onClick={() => {
          onRemove()
        }}
      >
        Remove
      </button>
      {requirementOptions.length === 0 ? null : (
        <StageRequirements
          stageName={stage.name}
          options={requirementOptions}
          value={stage.requiredFields ?? []}
          onChange={(requiredFields) => {
            onChange({ requiredFields })
          }}
        />
      )}
    </div>
  )
}
