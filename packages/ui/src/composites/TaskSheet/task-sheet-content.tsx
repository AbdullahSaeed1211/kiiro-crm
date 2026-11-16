'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Textarea } from '@ops/ui/components/ui/textarea'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { isTerminalStage } from '../KanbanBoard/board-state'
import { TaskActionsBar, TaskHeading, TaskMessage } from './task-sheet-parts'
import { TaskProperties } from './task-properties'
import { TaskSubtasks } from './task-subtasks'
import { TaskSheetDirtyProvider } from './task-sheet-dirty'
import { useTaskChanges } from './use-task-changes'
import type { TaskChange, TaskSheetActions, TaskSheetLabels, TaskSheetOptions, TaskSheetTask } from './types'

/** Props shared by the panel and the full page. */
export type TaskViewProps = Readonly<{
  task: TaskSheetTask
  options: TaskSheetOptions
  actions: TaskSheetActions
  labels: TaskSheetLabels
  /** Canonical responsibility controls belong beside the core task properties. */
  propertiesExtra?: ReactNode
  /** Extra content the app adds below the subtasks, such as the time log. */
  extra?: ReactNode
}>

/** Set by the panel so closing with any unsaved editor asks first. */
export type CloseGuard = Readonly<{
  onDirtyChange: (editor: string, dirty: boolean) => void
  dirty: boolean
  confirming: boolean
  onKeep: () => void
  onDiscard: () => void
}>

const NO_GUARD: CloseGuard = {
  onDirtyChange: () => undefined,
  dirty: false,
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
  onDraftChange,
}: Readonly<{
  task: TaskSheetTask
  labels: TaskSheetLabels
  canUpdate: boolean
  busy: boolean
  onSave: (description: string) => void
  onDirtyChange: (dirty: boolean) => void
  onDraftChange: (description: string) => void
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
          onDraftChange(event.target.value)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && dirty && !busy) {
            event.preventDefault()
            onSave(description)
          }
        }}
        placeholder={labels.descriptionPlaceholder}
        rows={6}
      />
    </section>
  )
}

function TaskSheetBody({
  task,
  options,
  actions,
  labels,
  propertiesExtra,
  extra,
  pending,
  message,
  fields,
  onSaveProperty,
  onSaveDescription,
  onDirtyChange,
  onDraftChange,
}: Readonly<{
  task: TaskSheetTask
  options: TaskSheetOptions
  actions: TaskSheetActions
  labels: TaskSheetLabels
  propertiesExtra?: ReactNode
  extra?: ReactNode
  pending: TaskChange['kind'] | null
  message: string | null
  fields: Readonly<Record<string, string>>
  onSaveProperty: (change: TaskChange) => void
  onSaveDescription: (description: string) => void
  onDirtyChange: (dirty: boolean) => void
  onDraftChange: (description: string) => void
}>) {
  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3 sm:px-5">
      <div>
        <TaskProperties
          task={task}
          options={options}
          labels={labels}
          taskHref={actions.taskHref}
          busy={pending !== null}
          fields={fields}
          onSave={onSaveProperty}
        />
        {propertiesExtra}
        {options.canUpdate ? <p className="mt-2 text-xs text-muted-foreground">{labels.autoSaveHint}</p> : null}
        <TaskMessage message={message} />
      </div>
      <DescriptionSection
        task={task}
        labels={labels}
        canUpdate={options.canUpdate}
        busy={pending === 'description'}
        onSave={onSaveDescription}
        onDirtyChange={onDirtyChange}
        onDraftChange={onDraftChange}
      />
      <TaskSubtasks task={task} labels={labels} actions={actions} canUpdate={options.canUpdate} />
      {extra}
    </div>
  )
}

function UnsavedChangesDialog({
  labels,
  onKeep,
  onDiscard,
}: Readonly<{ labels: TaskSheetLabels; onKeep: () => void; onDiscard: () => void }>) {
  return (
    <div
      role="alertdialog"
      aria-label={labels.unsavedChanges}
      className="flex flex-col gap-2 border-t bg-muted/40 px-4 py-3"
    >
      <p className="text-sm">{labels.unsavedChanges}</p>
      <div className="flex gap-2">
        <Button size="sm" onClick={onKeep}>
          {labels.keepEditing}
        </Button>
        <Button size="sm" variant="outline" onClick={onDiscard}>
          {labels.discard}
        </Button>
      </div>
    </div>
  )
}

/** Task detail body: heading, editable properties, description, subtasks and the complete action. */
export function TaskSheetContent({
  task,
  options,
  actions,
  labels,
  propertiesExtra,
  extra,
  asPage,
  onClose,
  guard = NO_GUARD,
}: TaskViewProps & Readonly<{ asPage: boolean; onClose: () => void; guard?: CloseGuard }>) {
  const { save, pending, message, fields } = useTaskChanges(task, actions.onChange, labels.saveFailed)
  const [descriptionDirty, setDescriptionDirty] = useState(false)
  const [descriptionSaved, setDescriptionSaved] = useState(false)
  const descriptionDraft = useRef(task.description ?? '')
  useEffect(() => {
    descriptionDraft.current = task.description ?? ''
  }, [task.description])
  const stage = options.stages.find((item) => item.id === task.stageId)
  const terminal = stage !== undefined && isTerminalStage(stage)
  const onDescriptionDirtyChange = useCallback(
    (dirty: boolean) => {
      setDescriptionDirty(dirty)
      guard.onDirtyChange('description', dirty)
    },
    [guard.onDirtyChange],
  )
  const onDescriptionDraftChange = useCallback((description: string) => {
    descriptionDraft.current = description
    setDescriptionSaved(false)
  }, [])
  const saveDescription = async (description = descriptionDraft.current) => {
    const result = await save({ kind: 'description', description })
    setDescriptionSaved(result)
    return result
  }
  return (
    <TaskSheetDirtyProvider value={guard.onDirtyChange}>
      <>
        <TaskHeading title={task.title} labels={labels} asPage={asPage} ownerOnly={task.ownerOnly} />
        <TaskSheetBody
          task={task}
          options={options}
          actions={actions}
          labels={labels}
          propertiesExtra={propertiesExtra}
          extra={extra}
          pending={pending}
          message={message}
          fields={fields}
          onSaveProperty={(change) => void save(change, labels.saved)}
          onSaveDescription={(description) => void saveDescription(description)}
          onDirtyChange={onDescriptionDirtyChange}
          onDraftChange={onDescriptionDraftChange}
        />
        {guard.confirming ? (
          <UnsavedChangesDialog labels={labels} onKeep={guard.onKeep} onDiscard={guard.onDiscard} />
        ) : null}
        <TaskActionsBar
          labels={labels}
          asPage={asPage}
          terminal={terminal}
          completing={pending === 'complete'}
          canUpdate={options.canUpdate}
          canComplete={!guard.dirty && pending === null}
          descriptionDirty={descriptionDirty}
          descriptionPending={pending === 'description'}
          descriptionSaved={descriptionSaved}
          onSaveDescription={() => void saveDescription()}
          onComplete={() => void save({ kind: 'complete', reopen: terminal })}
          onClose={onClose}
        />
      </>
    </TaskSheetDirtyProvider>
  )
}
