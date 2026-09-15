'use client'

import { TaskSheet, type TaskSheetTask } from '@ops/ui/composites/TaskSheet'
import { useRouter } from 'next/navigation'
import { completeOrReopenTask } from '../../../../server/actions/work/tasks/completeOrReopenTask'
import { saveTaskDescriptionForSheet } from '../../../../server/actions/work/tasks/saveTaskDescription'

/** Route-aware task drawer. Browser history preserves the exact originating surface. */
export function TaskDetailDrawer({
  task,
  returnTo = '/tasks',
  panel = true,
}: Readonly<{ task: TaskSheetTask; returnTo?: string; panel?: boolean }>) {
  const router = useRouter()
  return (
    <TaskSheet
      open={panel}
      renderAsPage={!panel}
      task={task}
      onSaveDescription={saveTaskDescriptionForSheet}
      onComplete={completeOrReopenTask}
      onOpenChange={(open) => {
        if (!open) {
          router.replace(returnTo)
        }
      }}
    />
  )
}
