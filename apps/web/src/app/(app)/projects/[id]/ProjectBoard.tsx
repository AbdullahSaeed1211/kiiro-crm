'use client'

import { KanbanBoard, type KanbanBoardLabels, type KanbanCard, type KanbanStage } from '@ops/ui/composites/KanbanBoard'
import { useRouter } from 'next/navigation'
import { moveTask } from '../../../../server/actions/work/tasks/moveTask'

export default function ProjectBoard({
  stages,
  cards,
}: Readonly<{ stages: readonly KanbanStage[]; cards: readonly KanbanCard[] }>) {
  const router = useRouter()
  const labels: KanbanBoardLabels = {
    expand: 'Expand',
    collapse: 'Collapse',
    moveTo: 'Move to',
    moveFailed: 'Move failed',
    conflict: 'This task changed; refreshed.',
  }
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
