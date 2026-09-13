'use client'

import { KanbanBoard, type KanbanBoardLabels, type KanbanCard, type KanbanStage } from '@ops/ui/composites/KanbanBoard'
import { useRouter } from 'next/navigation'
import { moveTask } from '../../../../server/actions/work/tasks/moveTask'

type TaskBoardProps = Readonly<{
  stages: readonly KanbanStage[]
  cards: readonly KanbanCard[]
  labels: KanbanBoardLabels
}>

/** Connects the board to the `moveTask` action and refreshes server data after a conflict. */
export function TaskBoard({ stages, cards, labels }: TaskBoardProps) {
  const router = useRouter()
  return (
    <KanbanBoard
      stages={stages}
      cards={cards}
      labels={labels}
      onMove={({ cardId, toStageId, expectedUpdatedAt }) => moveTask({ taskId: cardId, toStageId, expectedUpdatedAt })}
      onConflict={() => {
        router.refresh()
      }}
    />
  )
}
