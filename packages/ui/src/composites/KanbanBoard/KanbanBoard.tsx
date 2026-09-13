'use client'

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter'
import { useEffect, useEffectEvent, useMemo, useState, useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import {
  applyMove,
  confirmMove,
  dropStageId,
  groupCards,
  initialCollapsed,
  planMove,
  readCardData,
  rollbackMove,
  settleMove,
  toggleCollapsed,
} from './board-state'
import { KanbanColumn } from './KanbanColumn'
import type { KanbanBoardLabels, KanbanCard, KanbanMove, KanbanMoveResult, KanbanStage } from './types'

/** Props of {@link KanbanBoard}. */
export type KanbanBoardProps = Readonly<{
  stages: readonly KanbanStage[]
  cards: readonly KanbanCard[]
  labels: KanbanBoardLabels
  /** Persists a stage change, normally a server action. */
  onMove: (move: KanbanMove) => Promise<KanbanMoveResult>
  /** Reloads server data after a CONFLICT, normally `router.refresh`. */
  onConflict?: () => void
}>

// Drag needs a fine pointer and at least the md breakpoint (D-43); the card menu covers the rest.
const DRAG_QUERY = '(min-width: 48rem) and (pointer: fine)'
const NO_CARDS: readonly KanbanCard[] = []

function subscribeDragQuery(onChange: () => void) {
  const query = window.matchMedia(DRAG_QUERY)
  query.addEventListener('change', onChange)
  return () => {
    query.removeEventListener('change', onChange)
  }
}

const dragQueryMatches = () => window.matchMedia(DRAG_QUERY).matches
const dragDisabledOnServer = () => false

function useCardMoves({ cards, labels, onMove, onConflict }: Omit<KanbanBoardProps, 'stages'>) {
  const [source, setSource] = useState(cards)
  const [current, setCurrent] = useState(cards)
  // New server props (revalidation or refresh) replace the optimistic state.
  if (source !== cards) {
    setSource(cards)
    setCurrent(cards)
  }

  const runMove = async (move: KanbanMove, previous: KanbanCard) => {
    setCurrent((state) => applyMove(state, move))
    const result = await settleMove(() => onMove(move))
    if (result.ok) {
      setCurrent((state) => confirmMove(state, move.cardId, result.data))
      return
    }
    setCurrent((state) => rollbackMove(state, previous))
    if (result.error.code === 'CONFLICT') {
      toast.error(labels.conflict)
      onConflict?.()
      return
    }
    toast.error(labels.moveFailed, { description: result.error.message })
  }

  const moveCard = (cardId: string, toStageId: string) => {
    const move = planMove(current, cardId, toStageId)
    const previous = current.find((card) => card.id === cardId)
    if (move !== undefined && previous !== undefined) void runMove(move, previous)
  }

  return { current, moveCard }
}

/** Stage board with drag and drop between columns, optimistic moves and rollback on failure (spec §17.5). */
export function KanbanBoard({ stages, cards, labels, onMove, onConflict }: KanbanBoardProps) {
  const { current, moveCard } = useCardMoves({ cards, labels, onMove, ...(onConflict ? { onConflict } : {}) })
  const [collapsed, setCollapsed] = useState(() => initialCollapsed(stages))
  const dragEnabled = useSyncExternalStore(subscribeDragQuery, dragQueryMatches, dragDisabledOnServer)
  const groups = useMemo(() => groupCards(stages, current), [stages, current])

  const handleDrop = useEffectEvent((data: Record<string, unknown>, targets: Parameters<typeof dropStageId>[0]) => {
    const card = readCardData(data)
    const toStageId = dropStageId(targets)
    if (card !== undefined && toStageId !== undefined) moveCard(card.cardId, toStageId)
  })

  useEffect(
    () =>
      monitorForElements({
        canMonitor: ({ source }) => readCardData(source.data) !== undefined,
        onDrop: ({ source, location }) => {
          handleDrop(source.data, location.current.dropTargets)
        },
      }),
    [],
  )

  return (
    <div className="flex min-h-96 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:snap-none">
      {stages.map((stage) => (
        <KanbanColumn
          key={stage.id}
          stage={stage}
          stages={stages}
          cards={groups.get(stage.id) ?? NO_CARDS}
          collapsed={collapsed.has(stage.id)}
          dragEnabled={dragEnabled}
          labels={labels}
          onToggle={(stageId) => {
            setCollapsed((state) => toggleCollapsed(state, stageId))
          }}
          onMove={moveCard}
        />
      ))}
    </div>
  )
}
