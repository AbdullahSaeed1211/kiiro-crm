'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Textarea } from '@ops/ui/components/ui/textarea'
import { useEffect, useState } from 'react'
import {
  TaskSheetHeader,
  TaskSheetFooter,
  MessageDisplay,
  TaskSheetViewWrapper,
  isTerminalStage,
} from './task-sheet-parts'
import type { CompleteTaskParams, SaveDescriptionParams, TaskSaveResult, TaskSheetTask } from './types'

export type { TaskSheetTask } from './types'

function Description({
  value,
  onChange,
  onSave,
  disabled = false,
}: Readonly<{
  value: string
  onChange: (value: string) => void
  onSave: (() => void | Promise<void>) | undefined
  disabled?: boolean
}>) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-medium">Description</h3>
      <Textarea
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
        }}
        placeholder="Add a description…"
        rows={7}
      />
      {onSave === undefined ? null : (
        <Button
          size="sm"
          variant="outline"
          className="mt-2"
          disabled={disabled}
          onClick={() => {
            void onSave()
          }}
        >
          {disabled ? 'Saving…' : 'Save description'}
        </Button>
      )}
    </section>
  )
}

function Subtasks({ task }: Readonly<{ task: TaskSheetTask }>) {
  const subtasks = task.subtasks ?? []
  const complete = subtasks.filter((item) => item.complete).length
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium">Subtasks</h3>
        <span className="text-xs text-muted-foreground">
          {complete}/{subtasks.length}
        </span>
      </div>
      {subtasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No subtasks yet.</p>
      ) : (
        <ul className="space-y-2">
          {subtasks.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm">
              <span aria-hidden>{item.complete ? '✓' : '○'}</span>
              {item.title}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Task detail editor shared by list, calendar and record pages. Persistence is supplied by the caller. */
function TaskSheetContent({
  task,
  open,
  onOpenChange,
  onSaveDescription,
  onComplete,
  renderAsPage = false,
}: Readonly<{
  task: TaskSheetTask
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaveDescription?: (params: SaveDescriptionParams) => Promise<TaskSaveResult> | TaskSaveResult
  onComplete?: (params: CompleteTaskParams) => Promise<boolean> | boolean
  renderAsPage?: boolean
}>) {
  const [description, setDescription] = useState(task.description ?? '')
  const [busyAction, setBusyAction] = useState<'description' | 'complete' | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    setMessage(null)
  }, [task.id])
  useEffect(() => {
    setDescription(task.description ?? '')
  }, [task.description])
  const busy = busyAction !== null
  const expectedUpdatedAt = task.updatedAt ?? 0
  const terminal = isTerminalStage(task.stageCategory)
  const handleComplete = async () => {
    if (!onComplete) return
    setBusyAction('complete')
    setMessage(null)
    const saved = await onComplete({ taskId: task.id, expectedUpdatedAt, reopen: terminal })
    setBusyAction(null)
    setMessage(saved ? 'Saved.' : 'This task changed. Refresh and try again.')
  }
  const handleSaveDescription = !onSaveDescription
    ? undefined
    : async () => {
        setBusyAction('description')
        setMessage(null)
        const result = await onSaveDescription({ taskId: task.id, expectedUpdatedAt, description })
        setBusyAction(null)
        setMessage(result.ok ? 'Saved.' : result.error)
      }
  const detail = (
    <>
      <TaskSheetHeader title={task.title} task={task} renderAsPage={renderAsPage} />
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4">
        <Description value={description} onChange={setDescription} disabled={busy} onSave={handleSaveDescription} />
        <Subtasks task={task} />
        <MessageDisplay message={message} />
      </div>
      <TaskSheetFooter
        onComplete={onComplete}
        onOpenChange={onOpenChange}
        busyAction={busyAction}
        terminal={terminal}
        busy={busy}
        handleComplete={handleComplete}
      />
    </>
  )
  return <TaskSheetViewWrapper renderAsPage={renderAsPage} detail={detail} open={open} onOpenChange={onOpenChange} />
}

export function TaskSheet({
  task,
  open,
  onOpenChange,
  onSaveDescription,
  onComplete,
  renderAsPage,
}: Readonly<{
  task: TaskSheetTask | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaveDescription?: (params: SaveDescriptionParams) => Promise<TaskSaveResult> | TaskSaveResult
  onComplete?: (params: CompleteTaskParams) => Promise<boolean> | boolean
  renderAsPage?: boolean
}>) {
  if (!task) return null
  return (
    <TaskSheetContent
      task={task}
      open={open}
      onOpenChange={onOpenChange}
      {...(onSaveDescription && { onSaveDescription })}
      {...(onComplete && { onComplete })}
      {...(renderAsPage && { renderAsPage })}
    />
  )
}
