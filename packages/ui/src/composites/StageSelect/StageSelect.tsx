'use client'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@ops/ui/components/ui/select'
import { StageDot } from '../StagePill/StagePill'
import { groupStages, type StageOption } from '../StagePill/stage'

/** Translated strings of {@link StageSelect}. */
export type StageSelectLabels = Readonly<{
  /** Accessible name of the trigger, such as "Stage". */
  label: string
  /** Heading above the terminal stages, such as "Closed". */
  terminalGroup: string
  placeholder: string
}>

/** Props of {@link StageSelect}. */
export type StageSelectProps = Readonly<{
  stages: readonly StageOption[]
  /** Current stage id; `null` shows the placeholder. */
  value: string | null
  /** Called with the chosen stage id; not called when the current stage is picked again. */
  onChange: (stageId: string) => void
  labels: StageSelectLabels
  /** Read-only state, for example a converted lead (spec §17.6). */
  disabled?: boolean
  size?: 'sm' | 'default'
  id?: string | undefined
  className?: string | undefined
}>

function StageItems({ stages }: Readonly<{ stages: readonly StageOption[] }>) {
  return stages.map((stage) => (
    <SelectItem key={stage.id} value={stage.id}>
      <StageDot color={stage.color} />
      {stage.name}
    </SelectItem>
  ))
}

function CurrentStage({ stage, placeholder }: Readonly<{ stage: StageOption | undefined; placeholder: string }>) {
  if (stage === undefined) return <span className="truncate text-muted-foreground">{placeholder}</span>
  return (
    <>
      <StageDot color={stage.color} />
      <span className="truncate">{stage.name}</span>
    </>
  )
}

/** Workflow stage picker with color dots; terminal stages are grouped last under their own heading. */
export function StageSelect({
  stages,
  value,
  onChange,
  labels,
  disabled = false,
  size = 'default',
  id,
  className,
}: StageSelectProps) {
  const { open, terminal } = groupStages(stages)
  const current = stages.find((stage) => stage.id === value)
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(next: string | null) => {
        if (next !== null && next !== value) onChange(next)
      }}
    >
      <SelectTrigger id={id} size={size} aria-label={labels.label} className={className}>
        <SelectValue>{() => <CurrentStage stage={current} placeholder={labels.placeholder} />}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false}>
        <SelectGroup>
          <StageItems stages={open} />
        </SelectGroup>
        {terminal.length === 0 ? null : (
          <>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>{labels.terminalGroup}</SelectLabel>
              <StageItems stages={terminal} />
            </SelectGroup>
          </>
        )}
      </SelectContent>
    </Select>
  )
}
