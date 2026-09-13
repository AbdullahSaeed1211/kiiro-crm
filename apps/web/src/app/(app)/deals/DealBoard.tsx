'use client'

import { KanbanBoard, type KanbanBoardLabels, type KanbanCard, type KanbanStage } from '@ops/ui/composites/KanbanBoard'
import { useRouter } from 'next/navigation'
import { moveDealAction } from '../../../server/crm/deals/actions'

export function DealBoard({
  stages,
  cards,
  labels,
}: Readonly<{ stages: readonly KanbanStage[]; cards: readonly KanbanCard[]; labels: KanbanBoardLabels }>) {
  const router = useRouter()
  return (
    <KanbanBoard
      stages={stages}
      cards={cards}
      labels={labels}
      onMove={async ({ cardId, toStageId, expectedUpdatedAt }) => {
        const result = await moveDealAction({ dealId: cardId, toStageId, expectedUpdatedAt })
        if (!result.ok) return { ok: false, error: { code: result.code ?? 'INTERNAL', message: result.message } }
        return { ok: true, data: { stageId: toStageId, updatedAt: result.updatedAt } }
      }}
      onConflict={() => {
        router.refresh()
      }}
    />
  )
}
