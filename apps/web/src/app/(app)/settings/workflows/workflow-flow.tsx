'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'
import type { WorkflowCopy } from '../../../../i18n/workflow-copy'
import { insertStage, moveStage } from './stage-moves'
import { FlowNode } from './workflow-flow-node'
import { isTerminal, type RequirementOption, type Stage } from './workflow-model'

function InsertButton({ label, onClick }: Readonly<{ label: string; onClick: () => void }>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="inline-flex size-7 shrink-0 items-center justify-center self-center rounded-full border border-dashed text-muted-foreground hover:border-solid hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onClick}
    >
      <Plus className="size-4" aria-hidden />
    </button>
  )
}

/**
 * The steps of a workflow laid out as a flow from left to right. Steps can be dragged or nudged to a new place,
 * and a + between two steps adds a step there. New records begin in the first step that is not an ending.
 */
export function WorkflowFlow({
  stages,
  showChance,
  requirements,
  copy,
  onStages,
}: Readonly<{
  stages: readonly Stage[]
  showChance: boolean
  requirements: readonly RequirementOption[]
  copy: WorkflowCopy
  onStages: (next: Stage[]) => void
}>) {
  const [dragging, setDragging] = useState<number>()
  const startId = stages.find((stage) => !isTerminal(stage.category))?.id
  const change = (id: string, changes: Partial<Stage>) => {
    onStages(stages.map((stage) => (stage.id === id ? { ...stage, ...changes } : stage)))
  }
  return (
    <section aria-label={copy.stagesTitle} className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold">{copy.stagesTitle}</h3>
        <p className="text-xs text-muted-foreground">
          {copy.stagesHelp} {copy.startHelp}
        </p>
      </div>
      <ol className="flex flex-col gap-2 pb-2 lg:flex-row lg:flex-wrap">
        {stages.map((stage, index) => (
          <li
            key={stage.id}
            className="flex flex-col gap-2 lg:flex-row"
            draggable
            onDragStart={() => {
              setDragging(index)
            }}
            onDragOver={(event) => {
              if (dragging !== undefined) event.preventDefault()
            }}
            onDrop={(event) => {
              event.preventDefault()
              if (dragging !== undefined) onStages(moveStage(stages, dragging, index))
              setDragging(undefined)
            }}
            onDragEnd={() => {
              setDragging(undefined)
            }}
          >
            <FlowNode
              stage={stage}
              isStart={stage.id === startId}
              showChance={showChance}
              requirements={requirements}
              copy={copy}
              actions={{
                onChange: (changes) => {
                  change(stage.id, changes)
                },
                onEarlier: () => {
                  onStages(moveStage(stages, index, index - 1))
                },
                onLater: () => {
                  onStages(moveStage(stages, index, index + 1))
                },
                onRemove: () => {
                  onStages(stages.filter((candidate) => candidate.id !== stage.id))
                },
              }}
            />
            <InsertButton
              label={copy.addStageAt}
              onClick={() => {
                onStages(insertStage(stages, index + 1))
              }}
            />
          </li>
        ))}
      </ol>
    </section>
  )
}
