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
import { useCallback, useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react'
import { taskSheetLabels } from '../../../../i18n/task-sheet-copy'
import { changeTask, createSubtask } from '../../../../server/actions/work/tasks/changeTask'
import { taskHref } from '../../task-navigation'
import { TaskResponsibilityControls } from './TaskResponsibilityControls'
import type { TaskView } from '../../../../server/queries/work/task-details'
import { normalizeLocale } from '../../../../i18n/locale'

function ResponsibilitySlot(
  input: Readonly<{
    task: TaskSheetTask
    options: TaskSheetOptions
    responsibility?: TaskView['responsibility']
  }>,
): ReactElement {
  const { task, options, responsibility } = input
  return (
    <>
      {responsibility === undefined ? null : (
        <TaskResponsibilityControls
          taskId={task.id}
          updatedAt={task.updatedAt}
          {...responsibility}
          people={options.members}
          canUpdate={options.canUpdate}
          locale={normalizeLocale(options.locale)}
        />
      )}
    </>
  )
}

async function refreshAfter<T extends { ok: boolean }>(
  pending: Promise<T>,
  router: ReturnType<typeof useRouter>,
): Promise<T> {
  const result = await pending
  if (result.ok) router.refresh()
  return result
}

function taskSheetActions(input: {
  handleChange: TaskSheetActions['onChange']
  router: ReturnType<typeof useRouter>
  returnTo: string
}): TaskSheetActions {
  return {
    onChange: input.handleChange,
    onCreateSubtask: (parentTaskId, title) => refreshAfter(createSubtask(parentTaskId, title), input.router),
    taskHref: (taskId) => taskHref(taskId, input.returnTo),
  }
}

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
// eslint-disable-next-line complexity -- branches map each task change to its optimistic display field.
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
    case 'client':
      // The sheet shows no client field; the task page shows it after the refresh.
      return next
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
  responsibility,
  extra,
}: Readonly<{
  task: TaskSheetTask
  options: TaskSheetOptions
  returnTo?: string
  panel?: boolean
  restoreFocus?: boolean
  responsibility?: TaskView['responsibility']
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

  const actions = useMemo(() => taskSheetActions({ handleChange, router, returnTo }), [handleChange, router, returnTo])

  const labels = taskSheetLabels(options.locale)
  const detailOptions = responsibility === undefined ? options : { ...options, hasResponsibilityControls: true }
  const propertiesExtra = <ResponsibilitySlot task={task} options={options} responsibility={responsibility} />
  if (!panel)
    return (
      <TaskPage
        task={visibleTask}
        options={detailOptions}
        actions={actions}
        labels={labels}
        propertiesExtra={propertiesExtra}
        extra={extra}
      />
    )
  return (
    <TaskSheet
      task={visibleTask}
      options={detailOptions}
      actions={actions}
      labels={labels}
      propertiesExtra={propertiesExtra}
      extra={extra}
      onClose={() => {
        if (restoreFocus) router.back()
        else router.replace(returnTo)
      }}
    />
  )
}
