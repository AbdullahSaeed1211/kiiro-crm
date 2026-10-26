'use client'

import {
  TaskPage,
  TaskSheet,
  type TaskChangeRequest,
  type TaskChangeResult,
  type TaskSheetActions,
  type TaskSheetOptions,
  type TaskSheetTask,
  type TaskChange,
} from '@ops/ui/composites/TaskSheet'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { taskSheetLabels } from '../../../../i18n/task-sheet-copy'
import { changeTask, createSubtask } from '../../../../server/actions/work/tasks/changeTask'
import { taskHref } from '../../task-navigation'

function completedTask(input: {
  task: TaskSheetTask
  change: Extract<TaskChange, { kind: 'complete' }>
  stages: TaskSheetOptions['stages']
}) {
  const { task, change, stages } = input
  const stage = stages.find((item) =>
    change.reopen ? ['open', 'active'].includes(item.category) : item.category === 'done_success',
  )
  return stage === undefined ? task : { ...task, stageId: stage.id }
}

// Each exhaustive branch maps one saved task change to its display field.
// eslint-disable-next-line complexity
function optimisticTask(input: {
  task: TaskSheetTask
  change: TaskChange
  updatedAt: number | undefined
  stages: TaskSheetOptions['stages']
}): TaskSheetTask {
  const { task, change, updatedAt, stages } = input
  const next = { ...task, updatedAt: updatedAt ?? task.updatedAt }
  if (change.kind === 'complete') return completedTask({ task: next, change, stages })
  switch (change.kind) {
    case 'stage':
      return { ...next, stageId: change.stageId }
    case 'priority':
      return { ...next, priority: change.priority }
    case 'repeat':
      return { ...next, repeat: change.repeat }
    case 'assignees':
      return { ...next, assigneeIds: change.assigneeIds }
    case 'group':
      return { ...next, groupId: change.groupId }
    case 'ownerOnly':
      return { ...next, ownerOnly: change.ownerOnly }
    case 'dates':
      return { ...next, startAt: change.startAt, dueAt: change.dueAt }
    case 'description':
      return { ...next, description: change.description }
  }
  return next
}

/** Route-aware task detail: the panel over the originating page, or the full page. History restores the origin. */
export function TaskDetailDrawer({
  task,
  options,
  returnTo = '/tasks',
  panel = true,
  restoreFocus = false,
  extra,
}: Readonly<{
  task: TaskSheetTask
  options: TaskSheetOptions
  returnTo?: string
  panel?: boolean
  restoreFocus?: boolean
  extra?: ReactNode
}>) {
  const router = useRouter()
  const [visibleTask, setVisibleTask] = useState(task)

  useEffect(() => {
    setVisibleTask((current) => (current.id !== task.id || task.updatedAt > current.updatedAt ? task : current))
  }, [task])

  useEffect(() => {
    if (restoreFocus) {
      window.sessionStorage.setItem('task-panel-focus-return', task.id)
      window.sessionStorage.setItem('task-panel-focus-path', returnTo)
    }
  }, [restoreFocus, returnTo, task.id])

  const handleChange = useCallback(
    async (request: TaskChangeRequest): Promise<TaskChangeResult> => {
      const result = await changeTask(request)
      if (result.ok) {
        setVisibleTask((current) =>
          optimisticTask({
            task: current,
            change: request.change,
            updatedAt: result.updatedAt,
            stages: options.stages,
          }),
        )
        router.refresh()
      }
      return result
    },
    [options.stages, router],
  )

  const actions = useMemo<TaskSheetActions>(() => {
    const refreshAfter = async <T extends { ok: boolean }>(pending: Promise<T>): Promise<T> => {
      const result = await pending
      if (result.ok) router.refresh()
      return result
    }
    return {
      onChange: handleChange,
      onCreateSubtask: (parentTaskId: string, title: string) => refreshAfter(createSubtask(parentTaskId, title)),
      taskHref: (taskId: string) => taskHref(taskId, returnTo),
    }
  }, [handleChange, router, returnTo])

  const labels = taskSheetLabels(options.locale)
  if (!panel) return <TaskPage task={visibleTask} options={options} actions={actions} labels={labels} extra={extra} />
  return (
    <TaskSheet
      task={visibleTask}
      options={options}
      actions={actions}
      labels={labels}
      extra={extra}
      onClose={() => {
        if (restoreFocus) router.back()
        else router.replace(returnTo)
      }}
    />
  )
}
