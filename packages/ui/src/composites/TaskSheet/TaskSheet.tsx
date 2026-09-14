/* eslint-disable */
'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@ops/ui/components/ui/sheet'
import { Textarea } from '@ops/ui/components/ui/textarea'
import { useEffect, useState } from 'react'

export interface TaskSheetTask {
  readonly id: string
  readonly title: string
  readonly stage: string
  readonly stageCategory?: string
  readonly updatedAt?: number
  readonly priority: string
  readonly assignees: readonly string[]
  readonly startAt?: number | null
  readonly dueAt?: number | null
  readonly description?: string | null
  readonly subtasks?: readonly { readonly id: string; readonly title: string; readonly complete: boolean }[]
}

function TaskMeta({ task }: Readonly<{ task: TaskSheetTask }>) {
  const assignees = task.assignees.length === 0 ? 'Unassigned' : task.assignees.join(', ')
  return (
    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
      <span>{task.stage}</span>
      <span>Priority: {task.priority}</span>
      <span>{assignees}</span>
    </div>
  )
}

function Description({
  value,
  onChange,
  onSave,
}: Readonly<{ value: string; onChange: (value: string) => void; onSave?: () => void; disabled?: boolean }>) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-medium">Description</h3>
      <Textarea
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
        }}
        placeholder="Add a description"
        rows={7}
      />
      <Button
        size="sm"
        variant="outline"
        className="mt-2"
        onClick={() => {
          onSave?.()
        }}
      >
        Save description
      </Button>
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
export function TaskSheet({
  task,
  open,
  onOpenChange,
  onSaveDescription,
  onComplete,
}: Readonly<{
  task: TaskSheetTask | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaveDescription?: (taskId: string, expectedUpdatedAt: number, description: string) => Promise<boolean> | boolean
  onComplete?: (taskId: string, expectedUpdatedAt: number, reopen: boolean) => Promise<boolean> | boolean
}>) {
  const [description, setDescription] = useState(task?.description ?? '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    setDescription(task?.description ?? '')
    setMessage(null)
  }, [task?.description, task?.id])
  if (task === null) return null
  const expectedUpdatedAt = task.updatedAt ?? 0
  const terminal = ['done_success', 'done_failure', 'cancelled'].includes(task.stageCategory ?? '')
  const handleComplete = async () => {
    if (onComplete === undefined) return
    setBusy(true)
    setMessage(null)
    const saved = await onComplete(task.id, expectedUpdatedAt, terminal)
    setBusy(false)
    setMessage(saved ? 'Saved.' : 'This task changed. Refresh and try again.')
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[560px]">
        <SheetHeader>
          <SheetTitle>{task.title}</SheetTitle>
          <TaskMeta task={task} />
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4">
          <Description
            value={description}
            onChange={setDescription}
            {...(onSaveDescription === undefined
              ? {}
              : {
                  onSave: async () => {
                    setBusy(true)
                    setMessage(null)
                    const saved = await onSaveDescription(task.id, expectedUpdatedAt, description)
                    setBusy(false)
                    setMessage(saved ? 'Saved.' : 'This task changed. Refresh and try again.')
                  },
                })}
          />
          <Subtasks task={task} />
        </div>
        <SheetFooter>
          <Button onClick={() => void handleComplete()} disabled={busy}>
            {terminal ? 'Reopen' : 'Complete'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            Close
          </Button>
        </SheetFooter>
        {message === null ? null : (
          <p className="px-4 pb-3 text-sm text-muted-foreground" role="status">
            {message}
          </p>
        )}
      </SheetContent>
    </Sheet>
  )
}
