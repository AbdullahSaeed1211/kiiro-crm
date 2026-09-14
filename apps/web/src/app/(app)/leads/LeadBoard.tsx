'use client'

import {
  KanbanBoard,
  type KanbanBoardLabels,
  type KanbanCard,
  type KanbanMove,
  type KanbanStage,
} from '@ops/ui/composites/KanbanBoard'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LostReasonDialog } from './LeadDialogs'
import { moveLead } from '../../../server/crm/leads/actions'
import { leadStageMoveError } from '../../../server/crm/leads/types'

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
  const [lostMove, setLostMove] = useState<{ leadId: string; expectedUpdatedAt: number } | null>(null)
  const handleMove = async (move: KanbanMove) => {
    const destination = stages.find((stage) => stage.id === move.toStageId)
    if (destination?.category === 'done_failure') {
      setLostMove({ leadId: move.cardId, expectedUpdatedAt: move.expectedUpdatedAt })
      return {
        ok: false as const,
        error: { code: 'VALIDATION', message: 'Choose a lost reason to mark the lead lost.' },
      }
    }
    if (destination !== undefined) {
      const error = leadStageMoveError(destination)
      if (error !== null) return { ok: false as const, error: { code: 'VALIDATION', message: error } }
    }
    return moveLead({ leadId: move.cardId, toStageId: move.toStageId, expectedUpdatedAt: move.expectedUpdatedAt })
  }
  return (
    <>
      <KanbanBoard
        stages={stages}
        cards={cards}
        labels={labels}
        onMove={handleMove}
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
          leadId={lostMove.leadId}
          expectedUpdatedAt={lostMove.expectedUpdatedAt}
          lostReasons={lostReasons}
        />
      )}
    </>
  )
}
