'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Textarea } from '@ops/ui/components/ui/textarea'
import { useEffect, useState, type ReactNode } from 'react'
import { isTerminalStage } from '../KanbanBoard/board-state'
import { TaskActionsBar, TaskHeading, TaskMessage } from './task-sheet-parts'
import { TaskProperties } from './task-properties'
import { TaskSubtasks } from './task-subtasks'
import { useTaskChanges } from './use-task-changes'
import type { TaskSheetActions, TaskSheetLabels, TaskSheetOptions, TaskSheetTask } from './types'

/** Props shared by the panel and the full page. */
export type TaskViewProps = Readonly<{
  task: TaskSheetTask
  options: TaskSheetOptions
  actions: TaskSheetActions
  labels: TaskSheetLabels
  /** Extra content the app adds below the subtasks, such as the time log. */
  extra?: ReactNode
}>

/** Set by the panel so closing with an unsaved description asks first. */
export type CloseGuard = Readonly<{
  onDirtyChange: (dirty: boolean) => void
  confirming: boolean
  onKeep: () => void
  onDiscard: () => void
}>

const NO_GUARD: CloseGuard = {
  onDirtyChange: () => undefined,
  confirming: false,
  onKeep: () => undefined,
  onDiscard: () => undefined,
}

function DescriptionSection({
  task,
  labels,
  canUpdate,
  busy,
  onSave,
  onDirtyChange,
}: Readonly<{
  task: TaskSheetTask
  labels: TaskSheetLabels
  canUpdate: boolean
  busy: boolean
  onSave: (description: string) => void
  onDirtyChange: (dirty: boolean) => void
}>) {
  const [description, setDescription] = useState(task.description ?? '')
  useEffect(() => {
    setDescription(task.description ?? '')
  }, [task.description])
  const dirty = canUpdate && description !== (task.description ?? '')
  useEffect(() => {
    onDirtyChange(dirty)
  }, [dirty, onDirtyChange])
  return (
    <section>
      <h3 className="mb-2 text-sm font-medium">{labels.description}</h3>
      <Textarea
        value={description}
        readOnly={!canUpdate}
        onChange={(event) => {
          setDescription(event.target.value)
        }}
        placeholder={labels.descriptionPlaceholder}
        rows={6}
      />
      {canUpdate ? (
        <Button
          size="sm"
          variant="outline"
          className="mt-2"
          disabled={busy || description === (task.description ?? '')}
          onClick={() => {
            onSave(description)
          }}
        >
          {busy ? labels.saving : labels.saveDescription}
        </Button>
      ) : null}
    </section>
  )
}

/** Task detail body: heading, editable properties, description, subtasks and the complete action. */
export function TaskSheetContent({
  task,
  options,
  actions,
  labels,
  extra,
  asPage,
  onClose,
  guard = NO_GUARD,
}: TaskViewProps & Readonly<{ asPage: boolean; onClose: () => void; guard?: CloseGuard }>) {
  const { save, pending, message, fields } = useTaskChanges(task, actions.onChange, labels.saveFailed)
  const stage = options.stages.find((item) => item.id === task.stageId)
  const terminal = stage !== undefined && isTerminalStage(stage)
  return (
    <>
      <TaskHeading title={task.title} labels={labels} asPage={asPage} />
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-3">
        <TaskProperties
          task={task}
          options={options}
          labels={labels}
          taskHref={actions.taskHref}
          busy={pending !== null}
          fields={fields}
          onSave={(change) => void save(change)}
        />
        <TaskMessage message={message} />
        <DescriptionSection
          task={task}
          labels={labels}
          canUpdate={options.canUpdate}
          busy={pending === 'description'}
          onSave={(description) => void save({ kind: 'description', description }, labels.saved)}
          onDirtyChange={guard.onDirtyChange}
        />
        <TaskSubtasks task={task} labels={labels} actions={actions} canUpdate={options.canUpdate} />
        {extra}
      </div>
      {guard.confirming ? (
        <div
          role="alertdialog"
          aria-label={labels.unsavedChanges}
          className="flex flex-col gap-2 border-t bg-muted/40 px-4 py-3"
        >
          <p className="text-sm">{labels.unsavedChanges}</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={guard.onKeep}>
              {labels.keepEditing}
            </Button>
            <Button size="sm" variant="outline" onClick={guard.onDiscard}>
              {labels.discard}
            </Button>
          </div>
        </div>
      ) : null}
      <TaskActionsBar
        labels={labels}
        asPage={asPage}
        terminal={terminal}
        completing={pending === 'complete'}
        canUpdate={options.canUpdate}
        onComplete={() => void save({ kind: 'complete', reopen: terminal })}
        onClose={onClose}
      />
    </>
  )
}
