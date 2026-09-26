'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Textarea } from '@ops/ui/components/ui/textarea'
import { useEffect, useState } from 'react'
import { TaskSheetHeader, TaskPageHeader, TaskSheetFooter, TaskPageFooter, MessageDisplay } from './task-sheet-parts'
import { isTerminalStageCategory } from './stage'
import type { CompleteTaskParams, SaveDescriptionParams, TaskSaveResult, TaskSheetTask } from './types'

type BusyAction = 'description' | 'complete' | null

interface TaskActionHandlers {
  onSaveDescription?: ((params: SaveDescriptionParams) => Promise<TaskSaveResult> | TaskSaveResult) | undefined
  onComplete?: ((params: CompleteTaskParams) => Promise<boolean> | boolean) | undefined
}

function useTaskActions(task: TaskSheetTask, handlers: TaskActionHandlers) {
  const { onSaveDescription, onComplete } = handlers
  const [description, setDescription] = useState(task.description ?? '')
  const [busyAction, setBusyAction] = useState<BusyAction>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    setMessage(null)
  }, [task.id])

  useEffect(() => {
    setDescription(task.description ?? '')
  }, [task.description])

  const busy = busyAction !== null
  const terminal = isTerminalStageCategory(task.stageCategory)

  const handleComplete = async () => {
    if (!onComplete) return
    setBusyAction('complete')
    setMessage(null)
    const saved = await onComplete({ taskId: task.id, expectedUpdatedAt: task.updatedAt ?? 0, reopen: terminal })
    setBusyAction(null)
    setMessage(saved ? 'Saved.' : 'This task changed. Refresh and try again.')
  }

  const handleSaveDescription = onSaveDescription
    ? async () => {
        setBusyAction('description')
        setMessage(null)
        const result = await onSaveDescription({ taskId: task.id, expectedUpdatedAt: task.updatedAt ?? 0, description })
        setBusyAction(null)
        setMessage(result.ok ? 'Saved.' : result.error)
      }
    : undefined

  return { description, setDescription, busyAction, message, busy, terminal, handleComplete, handleSaveDescription }
}

function DescriptionSection({
  description,
  onDescriptionChange,
  onSave,
  disabled,
}: Readonly<{
  description: string
  onDescriptionChange: (value: string) => void
  onSave?: (() => void | Promise<void>) | undefined
  disabled: boolean
}>) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-medium">Description</h3>
      <Textarea
        value={description}
        onChange={(e) => {
          onDescriptionChange(e.target.value)
        }}
        placeholder="Add a description…"
        rows={7}
      />
      {onSave && (
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

function AssigneesSection({ task }: Readonly<{ task: TaskSheetTask }>) {
  return (
    <section>
      <h3 className="text-sm font-medium">Assignees</h3>
      <p className="text-sm text-muted-foreground">
        {task.assignees.length === 0 ? 'Unassigned' : task.assignees.join(', ')}
      </p>
    </section>
  )
}

function SubtasksSection({ task }: Readonly<{ task: TaskSheetTask }>) {
  const subtasks = task.subtasks ?? []
  const completeCount = subtasks.filter((item) => item.complete).length

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium">Subtasks</h3>
        <span className="text-xs text-muted-foreground">
          {completeCount}/{subtasks.length}
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

export function TaskSheetContent({
  task,
  onOpenChange,
  onSaveDescription,
  onComplete,
  renderAsPage = false,
}: Readonly<{
  task: TaskSheetTask
  onOpenChange: (open: boolean) => void
  onSaveDescription?: (params: SaveDescriptionParams) => Promise<TaskSaveResult> | TaskSaveResult
  onComplete?: (params: CompleteTaskParams) => Promise<boolean> | boolean
  renderAsPage?: boolean
}>) {
  const { description, setDescription, busyAction, message, busy, terminal, handleComplete, handleSaveDescription } =
    useTaskActions(task, { onSaveDescription, onComplete })

  const Header = renderAsPage ? TaskPageHeader : TaskSheetHeader
  const Footer = renderAsPage ? TaskPageFooter : TaskSheetFooter

  return (
    <>
      <Header title={task.title} task={task} />
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4">
        <AssigneesSection task={task} />
        <DescriptionSection
          description={description}
          onDescriptionChange={setDescription}
          onSave={handleSaveDescription}
          disabled={busy}
        />
        <SubtasksSection task={task} />
        <MessageDisplay message={message} />
      </div>
      <Footer
        onComplete={onComplete}
        onOpenChange={onOpenChange}
        busyAction={busyAction}
        terminal={terminal}
        busy={busy}
        handleComplete={handleComplete}
      />
    </>
  )
}
