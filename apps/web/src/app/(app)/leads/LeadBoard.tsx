'use client'

import { KanbanBoard, type KanbanBoardLabels, type KanbanCard, type KanbanStage } from '@ops/ui/composites/KanbanBoard'
import { useRouter } from 'next/navigation'
import { moveLead } from '../../../server/crm/leads/actions'

export function LeadBoard({
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
      onMove={({ cardId, toStageId, expectedUpdatedAt }) => moveLead({ leadId: cardId, toStageId, expectedUpdatedAt })}
      onConflict={() => {
        router.refresh()
      }}
    />
  )
}
