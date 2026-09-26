'use client'

import { TaskSheet, TaskPage, type TaskSheetTask } from '@ops/ui/composites/TaskSheet'
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

  if (panel) {
    return (
      <TaskSheet
        open
        task={task}
        onSaveDescription={(params) =>
          saveTaskDescriptionForSheet(params.taskId, params.expectedUpdatedAt, params.description)
        }
        onComplete={(params) => completeOrReopenTask(params.taskId, params.expectedUpdatedAt, params.reopen)}
        onOpenChange={(open) => {
          if (!open) {
            if (restoreFocus) router.back()
            else router.replace(returnTo)
          }
        }}
      />
    )
  }

  return (
    <TaskPage
      task={task}
      onSaveDescription={(params) =>
        saveTaskDescriptionForSheet(params.taskId, params.expectedUpdatedAt, params.description)
      }
      onComplete={(params) => completeOrReopenTask(params.taskId, params.expectedUpdatedAt, params.reopen)}
    />
  )
}
