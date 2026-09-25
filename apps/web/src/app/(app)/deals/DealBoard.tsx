'use client'

import { KanbanBoard, type KanbanBoardLabels, type KanbanCard, type KanbanStage } from '@ops/ui/composites/KanbanBoard'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { moveDealAction } from '../../../server/crm/deals/actions'
import { DealLostDialog, type LostMove } from './DealLostDialog'
import { deferredLostMoveResult } from './deal-board-model'

export function DealBoard({
  stages,
  cards,
  labels,
  lostReasons,
}: Readonly<{
  stages: readonly KanbanStage[]
  cards: readonly KanbanCard[]
  labels: KanbanBoardLabels
  lostReasons: readonly Readonly<{ id: string; name: string }>[]
}>) {
  const router = useRouter()
  const [lostMove, setLostMove] = useState<LostMove | null>(null)
  const stageByCard = useRef(new Map(cards.map((card) => [card.id, card.stageId])))
  useEffect(() => {
    for (const card of cards) stageByCard.current.set(card.id, card.stageId)
  }, [cards])
  return (
    <>
      <KanbanBoard
        stages={stages}
        cards={cards}
        labels={labels}
        onMove={async ({ cardId, toStageId, expectedUpdatedAt }) => {
          const destination = stages.find((stage) => stage.id === toStageId)
          if (destination?.category === 'done_failure') {
            setLostMove({ cardId, expectedUpdatedAt })
            return deferredLostMoveResult(stageByCard.current.get(cardId) ?? toStageId, expectedUpdatedAt)
          }
          const result = await moveDealAction({ dealId: cardId, toStageId, expectedUpdatedAt })
          if (!result.ok) return { ok: false, error: result.error }
          stageByCard.current.set(cardId, toStageId)
          router.refresh()
          return { ok: true, data: { stageId: toStageId, updatedAt: result.data.updatedAt } }
        }}
        onConflict={() => {
          router.refresh()
        }}
      />
      <DealLostDialog
        move={lostMove}
        reasons={lostReasons}
        onClose={() => {
          setLostMove(null)
        }}
      />
    </>
  )
}
