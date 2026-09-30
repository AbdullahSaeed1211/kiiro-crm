'use client'

import {
  KanbanBoard,
  type KanbanBoardLabels,
  type KanbanCard,
  type KanbanMove,
  type KanbanStage,
} from '@ops/ui/composites/KanbanBoard'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { markLost } from '../../../server/crm/leads/actions'
import { LostReasonDialog } from '../LostReasonDialog'
import { moveLead } from '../../../server/crm/leads/actions'
import { leadMoveDestinationError } from '@ops/module-crm'
import { LeadCreateDialogClient } from '../quick-create/LeadCreateDialogClient'
import { deferredLostMoveResult } from '../board-model'

type LostMove = Readonly<{ leadId: string; expectedUpdatedAt: number }>

export function LeadBoard({
  stages,
  cards,
  lostReasons,
  labels,
}: Readonly<{
  stages: readonly KanbanStage[]
  cards: readonly KanbanCard[]
  lostReasons: readonly { id: string; name: string }[]
  labels: KanbanBoardLabels
}>) {
  const router = useRouter()
  const [lostMove, setLostMove] = useState<LostMove | null>(null)
  const stageByCard = useRef(new Map(cards.map((card) => [card.id, card.stageId])))
  useEffect(() => {
    for (const card of cards) stageByCard.current.set(card.id, card.stageId)
  }, [cards])
  const handleMove = async ({ cardId, toStageId, expectedUpdatedAt }: KanbanMove) => {
    const destination = stages.find((stage) => stage.id === toStageId)
    if (destination?.category === 'done_failure') {
      setLostMove({ leadId: cardId, expectedUpdatedAt })
      return deferredLostMoveResult(stageByCard.current.get(cardId) ?? toStageId, expectedUpdatedAt)
    }
    if (destination !== undefined) {
      const error = leadMoveDestinationError(destination)
      if (error !== null) return { ok: false as const, error: { code: 'VALIDATION', message: error } }
    }
    const result = await moveLead({ leadId: cardId, toStageId, expectedUpdatedAt })
    if (result.ok) stageByCard.current.set(cardId, toStageId)
    return result
  }
  return (
    <>
      <KanbanBoard
        stages={stages}
        cards={cards}
        labels={labels}
        onMove={handleMove}
        columnAction={(stage) => <LeadCreateDialogClient stageId={stage.id} compact />}
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
          recordId={lostMove.leadId}
          noun="lead"
          markLost={markLost}
          expectedUpdatedAt={lostMove.expectedUpdatedAt}
          lostReasons={lostReasons}
        />
      )}
    </>
  )
}
