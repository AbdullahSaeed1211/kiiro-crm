'use client'

import { Input } from '@ops/ui/components/ui/input'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { stageDotClass, toStageColor } from '@ops/ui/composites/StagePill/stage'
import { ChevronLeft, ChevronRight, GripVertical, Trash2 } from 'lucide-react'
import type { WorkflowCopy } from '../../../../i18n/workflow-copy'
import { COLORS } from './stage-constants'
import { StageRequirements } from './workflow-stage-requirements'
import { isTerminal, type RequirementOption, type Stage } from './workflow-model'
import { Button } from '@ops/ui/components/ui/button'

const fill = (template: string, name: string): string => template.replace('{name}', name)

function Swatches({
  value,
  copy,
  onChange,
}: Readonly<{ value: string; copy: WorkflowCopy; onChange: (colour: string) => void }>) {
  return (
    <div role="radiogroup" aria-label={copy.colour} className="flex flex-wrap gap-1.5">
      {COLORS.map((colour) => (
        <button
          key={colour}
          type="button"
          role="radio"
          aria-checked={colour === value}
          aria-label={copy.colours[colour] ?? colour}
          className={`size-8 rounded-full ring-offset-2 sm:size-5 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring ${stageDotClass(toStageColor(colour))} ${colour === value ? 'ring-2 ring-foreground' : ''}`}
          onClick={() => {
            onChange(colour)
          }}
        />
      ))}
    </div>
  )
}

function NodeTools({
  name,
  copy,
  tools,
}: Readonly<{
  name: string
  copy: WorkflowCopy
  tools: Readonly<{ onEarlier: () => void; onLater: () => void; onRemove: () => void }>
}>) {
  const button = 'text-muted-foreground'
  return (
    <div className="flex items-center gap-0.5">
      <span aria-hidden className="cursor-grab text-muted-foreground" title={fill(copy.dragToMove, name)}>
        <GripVertical className="size-4" />
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        className={button}
        type="button"
        aria-label={fill(copy.moveEarlier, name)}
        onClick={tools.onEarlier}
      >
        <ChevronLeft className="size-4 rotate-90 lg:rotate-0" aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className={button}
        type="button"
        aria-label={fill(copy.moveLater, name)}
        onClick={tools.onLater}
      >
        <ChevronRight className="size-4 rotate-90 lg:rotate-0" aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className={`${button} ml-auto hover:text-destructive`}
        type="button"
        aria-label={fill(copy.removeStage, name)}
        onClick={tools.onRemove}
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>
    </div>
  )
}

type NodeActions = Readonly<{
  onChange: (changes: Partial<Stage>) => void
  onEarlier: () => void
  onLater: () => void
  onRemove: () => void
}>

function Basics({
  stage,
  copy,
  onChange,
}: Readonly<{ stage: Stage; copy: WorkflowCopy; onChange: NodeActions['onChange'] }>) {
  return (
    <>
      <label className="grid gap-1 text-xs">
        <span className="font-medium">{copy.stageName}</span>
        <Input
          maxLength={60}
          value={stage.name}
          placeholder={copy.stageNamePlaceholder}
          onChange={(event) => {
            onChange({ name: event.target.value })
          }}
        />
      </label>
      <label className="grid gap-1 text-xs">
        <span className="font-medium">{copy.stageType}</span>
        <NativeSelect
          value={stage.category}
          onChange={(event) => {
            onChange({ category: event.target.value })
          }}
        >
          {Object.entries(copy.categories).map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </NativeSelect>
      </label>
    </>
  )
}

function Chance({
  stage,
  copy,
  onChange,
}: Readonly<{ stage: Stage; copy: WorkflowCopy; onChange: NodeActions['onChange'] }>) {
  return (
    <label className="grid gap-1 text-xs">
      <span className="font-medium">{copy.chance}</span>
      <Input
        type="number"
        min={0}
        max={100}
        value={stage.probability ?? ''}
        onChange={(event) => {
          onChange({ probability: event.target.value === '' ? undefined : Number(event.target.value) })
        }}
      />
    </label>
  )
}

function roleOf(isStart: boolean, ends: boolean): 'start' | 'end' | 'middle' {
  if (isStart) return 'start'
  return ends ? 'end' : 'middle'
}

function badgeFor(role: 'start' | 'end' | 'middle', copy: WorkflowCopy): string {
  if (role === 'start') return copy.start
  return role === 'end' ? copy.endsHere : ''
}

/** One step of the flow: a card with its colour, name, type, chance of winning and required fields. */
export function FlowNode({
  stage,
  isStart,
  showChance,
  requirements,
  copy,
  actions,
}: Readonly<{
  stage: Stage
  isStart: boolean
  showChance: boolean
  requirements: readonly RequirementOption[]
  copy: WorkflowCopy
  actions: NodeActions
}>) {
  const label = stage.name || copy.unnamed
  const ends = isTerminal(stage.category)
  const role = roleOf(isStart, ends)
  return (
    <div className={`w-full shrink-0 rounded-lg border bg-card lg:w-48 ${ends ? 'border-dashed' : ''}`}>
      <div className={`h-1.5 rounded-t-lg ${stageDotClass(toStageColor(stage.color))}`} />
      <div className="grid gap-3 p-3">
        <div className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
          <span>{badgeFor(role, copy)}</span>
          <NodeTools name={label} copy={copy} tools={actions} />
        </div>
        <Basics stage={stage} copy={copy} onChange={actions.onChange} />
        <Swatches
          value={stage.color}
          copy={copy}
          onChange={(color) => {
            actions.onChange({ color })
          }}
        />
        {showChance ? <Chance stage={stage} copy={copy} onChange={actions.onChange} /> : null}
        {requirements.length === 0 ? null : (
          <StageRequirements
            stageName={label}
            options={requirements}
            value={stage.requiredFields ?? []}
            copy={copy}
            onChange={(requiredFields) => {
              actions.onChange({ requiredFields })
            }}
          />
        )}
      </div>
    </div>
  )
}
