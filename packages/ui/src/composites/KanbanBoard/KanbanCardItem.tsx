import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter'
import Link from 'next/link'
import { combine } from '@atlaskit/pragmatic-drag-and-drop/utils/combine'
import { attachClosestEdge, extractClosestEdge, type Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge'
import { EllipsisVertical } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@ops/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@ops/ui/components/ui/dropdown-menu'
import { cn } from '@ops/ui/lib/utils'
import { readCardData } from './board-state'
import { STAGE_DOT } from './stage-dot'
import type { KanbanCard, KanbanStage } from './types'

/** Moves a card to a stage; shared by drops and the "Move to…" menu. */
export type MoveCard = (cardId: string, toStageId: string) => void

type MoveMenuProps = Readonly<{
  card: KanbanCard
  stages: readonly KanbanStage[]
  label: string
  onMove: MoveCard
}>

type KanbanCardItemProps = MoveMenuProps & Readonly<{ dragEnabled: boolean }>

function useCardDrag(card: KanbanCard, enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [edge, setEdge] = useState<Edge | null>(null)
  const { id: cardId, stageId } = card
  useEffect(() => {
    const element = ref.current
    if (element === null || !enabled) return undefined
    const data = { cardId, stageId }
    return combine(
      draggable({
        element,
        getInitialData: () => data,
        onDragStart: () => {
          setDragging(true)
        },
        onDrop: () => {
          setDragging(false)
        },
      }),
      dropTargetForElements({
        element,
        // Cards of the same column are not drop targets: ordering within a column is not persisted yet (D-29).
        canDrop: ({ source }) => readCardData(source.data)?.stageId !== stageId,
        getData: ({ input }) => attachClosestEdge(data, { element, input, allowedEdges: ['top', 'bottom'] }),
        onDrag: ({ self }) => {
          setEdge(extractClosestEdge(self.data))
        },
        onDragLeave: () => {
          setEdge(null)
        },
        onDrop: () => {
          setEdge(null)
        },
      }),
    )
  }, [cardId, stageId, enabled])
  return { ref, dragging, edge }
}

function MoveMenu({ card, stages, label, onMove }: MoveMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        render={<Button variant="ghost" size="icon-sm" className="-my-1 -mr-1.5" />}
      >
        <EllipsisVertical aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          {stages.map((stage) => (
            <DropdownMenuItem
              key={stage.id}
              disabled={stage.id === card.stageId}
              onClick={() => {
                onMove(card.id, stage.id)
              }}
            >
              <span aria-hidden className={cn('size-2 rounded-full', STAGE_DOT[stage.color])} />
              {stage.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Board card: draggable on fine pointers from `md` up, with a "Move to…" menu otherwise (D-43). */
export function KanbanCardItem({ card, stages, label, onMove, dragEnabled }: KanbanCardItemProps) {
  const { ref, dragging, edge } = useCardDrag(card, dragEnabled)
  return (
    <div
      ref={ref}
      data-card-id={card.id}
      className={cn(
        'ops-kanban-card relative flex flex-col gap-2 rounded-lg border bg-card p-3 text-card-foreground shadow-xs',
        dragEnabled && 'cursor-grab',
        dragging && 'opacity-50',
      )}
    >
      {edge === null ? null : (
        <span
          aria-hidden
          className={cn(
            'absolute inset-x-0 h-0.5 rounded-full bg-primary',
            edge === 'top' ? '-top-1.5' : '-bottom-1.5',
          )}
        />
      )}
      <div className="flex items-start justify-between gap-2">
        {card.href === undefined ? (
          <span className="min-w-0 font-medium break-words">{card.title}</span>
        ) : (
          <Link
            className="min-w-0 font-medium break-words underline-offset-2 hover:text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href={card.href}
            data-task-link-id={card.id}
          >
            {card.title}
          </Link>
        )}
        <MoveMenu card={card} stages={stages} label={label} onMove={onMove} />
      </div>
      {card.meta === undefined ? null : (
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">{card.meta}</div>
      )}
    </div>
  )
}
