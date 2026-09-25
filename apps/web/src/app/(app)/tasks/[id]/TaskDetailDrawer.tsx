'use client'

import { TaskSheet, type TaskSheetTask } from '@ops/ui/composites/TaskSheet'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { completeOrReopenTask } from '../../../../server/actions/work/tasks/completeOrReopenTask'
import { saveTaskDescriptionForSheet } from '../../../../server/actions/work/tasks/saveTaskDescription'

/** Route-aware task drawer. Browser history preserves the exact originating surface. */
export function TaskDetailDrawer({
  task,
  returnTo = '/tasks',
  panel = true,
  restoreFocus = false,
}: Readonly<{ task: TaskSheetTask; returnTo?: string; panel?: boolean; restoreFocus?: boolean }>) {
  const router = useRouter()
  useEffect(() => {
    if (restoreFocus) window.sessionStorage.setItem('task-panel-focus-return', task.id)
  }, [restoreFocus, task.id])
  return (
    <TaskSheet
      open={panel}
      renderAsPage={!panel}
      task={task}
      onSaveDescription={({ taskId, expectedUpdatedAt, description }) =>
        saveTaskDescriptionForSheet(taskId, expectedUpdatedAt, description)
      }
      onComplete={({ taskId, expectedUpdatedAt, reopen }) => completeOrReopenTask(taskId, expectedUpdatedAt, reopen)}
      onOpenChange={(open) => {
        if (!open) {
          if (restoreFocus) router.back()
          else router.replace(returnTo)
        }
      }}
    />
  )
}
