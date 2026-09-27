'use client'

import {
  TaskPage,
  TaskSheet,
  type TaskChangeRequest,
  type TaskSheetActions,
  type TaskSheetOptions,
  type TaskSheetTask,
} from '@ops/ui/composites/TaskSheet'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import { taskSheetLabels } from '../../../../i18n/task-sheet-copy'
import { changeTask, createSubtask } from '../../../../server/actions/work/tasks/changeTask'
import { taskHref } from '../../task-navigation'

/** Route-aware task detail: the panel over the originating page, or the full page. History restores the origin. */
export function TaskDetailDrawer({
  task,
  options,
  returnTo = '/tasks',
  panel = true,
  restoreFocus = false,
}: Readonly<{
  task: TaskSheetTask
  options: TaskSheetOptions
  returnTo?: string
  panel?: boolean
  restoreFocus?: boolean
}>) {
  const router = useRouter()

  useEffect(() => {
    if (restoreFocus) window.sessionStorage.setItem('task-panel-focus-return', task.id)
  }, [restoreFocus, task.id])

  const actions = useMemo<TaskSheetActions>(() => {
    const refreshAfter = async <T extends { ok: boolean }>(pending: Promise<T>): Promise<T> => {
      const result = await pending
      if (result.ok) router.refresh()
      return result
    }
    return {
      onChange: (request: TaskChangeRequest) => refreshAfter(changeTask(request)),
      onCreateSubtask: (parentTaskId: string, title: string) => refreshAfter(createSubtask(parentTaskId, title)),
      taskHref: (taskId: string) => taskHref(taskId, returnTo),
    }
  }, [router, returnTo])

  const labels = taskSheetLabels(options.locale)
  if (!panel) return <TaskPage task={task} options={options} actions={actions} labels={labels} />
  return (
    <TaskSheet
      task={task}
      options={options}
      actions={actions}
      labels={labels}
      onClose={() => {
        if (restoreFocus) router.back()
        else router.replace(returnTo)
      }}
    />
  )
}
