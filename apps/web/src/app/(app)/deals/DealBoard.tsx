'use client'

import { KanbanBoard, type KanbanBoardLabels, type KanbanCard, type KanbanStage } from '@ops/ui/composites/KanbanBoard'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { moveDealAction } from '../../../server/crm/deals/actions'
import { DealLostDialog, type LostMove } from './DealLostDialog'

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
            return { ok: false, error: { code: 'VALIDATION', message: 'Choose a lost reason before closing a deal' } }
          }
          const result = await moveDealAction({ dealId: cardId, toStageId, expectedUpdatedAt })
          if (!result.ok) return { ok: false, error: { code: result.code ?? 'INTERNAL', message: result.message } }
          return { ok: true, data: { stageId: toStageId, updatedAt: result.updatedAt } }
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
