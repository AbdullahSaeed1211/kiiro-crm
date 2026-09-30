'use client'

import { KanbanBoard, type KanbanBoardLabels, type KanbanCard, type KanbanStage } from '@ops/ui/composites/KanbanBoard'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { markDealLostAction, moveDealAction } from '../../../server/crm/deals/actions'
import { deferredLostMoveResult } from '../board-model'
import { LostReasonDialog } from '../LostReasonDialog'

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
  const [lostMove, setLostMove] = useState<Readonly<{ cardId: string; expectedUpdatedAt: number }> | null>(null)
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
      {lostMove === null ? null : (
        <LostReasonDialog
          open
          onOpenChange={(open) => {
            if (!open) setLostMove(null)
          }}
          recordId={lostMove.cardId}
          noun="deal"
          markLost={markDealLostAction}
          expectedUpdatedAt={lostMove.expectedUpdatedAt}
          lostReasons={lostReasons}
        />
      )}
    </>
  )
}
