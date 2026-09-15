import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter'
import { ChevronsLeftRight, ChevronsRightLeft } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@ops/ui/components/ui/button'
import { cn } from '@ops/ui/lib/utils'
import { isTerminalStage, readCardData, withName } from './board-state'
import { KanbanCardItem, type MoveCard } from './KanbanCardItem'
import { STAGE_DOT } from './stage-dot'
import type { KanbanBoardLabels, KanbanCard, KanbanStage } from './types'

type ToggleProps = Readonly<{
  stage: KanbanStage
  collapsed: boolean
  labels: KanbanBoardLabels
  onToggle: (stageId: string) => void
}>

type KanbanColumnProps = ToggleProps &
  Readonly<{
    stages: readonly KanbanStage[]
    cards: readonly KanbanCard[]
    dragEnabled: boolean
    onMove: MoveCard
  }>

function useColumnDrop(stageId: string) {
  const ref = useRef<HTMLElement>(null)
  const [over, setOver] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (element === null) return undefined
    return dropTargetForElements({
      element,
      getData: () => ({ stageId }),
      canDrop: ({ source }) => readCardData(source.data) !== undefined,
      onDragEnter: ({ source }) => {
        setOver(readCardData(source.data)?.stageId !== stageId)
      },
      onDragLeave: () => {
        setOver(false)
      },
      onDrop: () => {
        setOver(false)
      },
    })
  }, [stageId])
  return { ref, over }
}

function ToggleButton({ stage, collapsed, labels, onToggle }: ToggleProps) {
  const Icon = collapsed ? ChevronsLeftRight : ChevronsRightLeft
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-expanded={!collapsed}
      aria-label={withName(collapsed ? labels.expand : labels.collapse, stage.name)}
      onClick={() => {
        onToggle(stage.id)
      }}
    >
      <Icon aria-hidden />
    </Button>
  )
}

function StageDot({ stage }: Readonly<{ stage: KanbanStage }>) {
  return <span aria-hidden className={cn('size-2 shrink-0 rounded-full', STAGE_DOT[stage.color])} />
}

function CardCount({ count }: Readonly<{ count: number }>) {
  return <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
}

/** Stage column; terminal stages collapse to a 48 px rail with a vertical label and count (spec §17.5). */
export function KanbanColumn({
  stage,
  stages,
  cards,
  collapsed,
  dragEnabled,
  labels,
  onToggle,
  onMove,
}: KanbanColumnProps) {
  const { ref, over } = useColumnDrop(stage.id)
  const toggle = <ToggleButton stage={stage} collapsed={collapsed} labels={labels} onToggle={onToggle} />
  return (
    <section
      ref={ref}
      aria-label={stage.name}
      data-stage-id={stage.id}
      className={cn(
        'ops-kanban-column flex shrink-0 snap-start flex-col gap-2 rounded-lg bg-muted/50 p-2 transition-colors',
        collapsed ? 'w-12 items-center' : 'w-72',
        over && 'bg-muted ring-2 ring-ring/50',
      )}
    >
      {collapsed ? (
        <>
          {toggle}
          <StageDot stage={stage} />
          <CardCount count={cards.length} />
          <span className="text-sm font-medium [writing-mode:vertical-rl]">{stage.name}</span>
        </>
      ) : (
        <>
          <header className="flex h-7 items-center gap-2 px-1">
            <StageDot stage={stage} />
            <h2 className="truncate text-sm font-medium">{stage.name}</h2>
            <CardCount count={cards.length} />
            {isTerminalStage(stage) ? <span className="ml-auto">{toggle}</span> : null}
          </header>
          {cards.map((card) => (
            <KanbanCardItem
              key={card.id}
              card={card}
              stages={stages}
              label={labels.moveTo}
              dragEnabled={dragEnabled}
              onMove={onMove}
            />
          ))}
        </>
      )}
    </section>
  )
}
