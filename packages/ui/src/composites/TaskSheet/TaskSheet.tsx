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

type TaskSaveResult = Readonly<{ ok: true }> | Readonly<{ ok: false; error: string }>

function Description({
  value,
  onChange,
  onSave,
  disabled = false,
}: Readonly<{
  value: string
  onChange: (value: string) => void
  onSave?: () => void | Promise<void>
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
export function TaskSheet({
  task,
  open,
  onOpenChange,
  onSaveDescription,
  onComplete,
  renderAsPage = false,
}: Readonly<{
  task: TaskSheetTask | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaveDescription?: (
    taskId: string,
    expectedUpdatedAt: number,
    description: string,
  ) => Promise<TaskSaveResult> | TaskSaveResult
  onComplete?: (taskId: string, expectedUpdatedAt: number, reopen: boolean) => Promise<boolean> | boolean
  renderAsPage?: boolean
}>) {
  const [description, setDescription] = useState(task?.description ?? '')
  const [busyAction, setBusyAction] = useState<'description' | 'complete' | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    setMessage(null)
  }, [task?.id])
  useEffect(() => {
    setDescription(task?.description ?? '')
  }, [task?.description])
  if (task === null) return null
  const busy = busyAction !== null
  const expectedUpdatedAt = task.updatedAt ?? 0
  const terminal = ['done_success', 'done_failure', 'cancelled'].includes(task.stageCategory ?? '')
  const handleComplete = async () => {
    if (onComplete === undefined) return
    setBusyAction('complete')
    setMessage(null)
    const saved = await onComplete(task.id, expectedUpdatedAt, terminal)
    setBusyAction(null)
    setMessage(saved ? 'Saved.' : 'This task changed. Refresh and try again.')
  }
  const detail = (
    <>
      <SheetHeader>
        {renderAsPage ? (
          <h1 className="font-heading text-xl font-semibold text-foreground">{task.title}</h1>
        ) : (
          <SheetTitle>{task.title}</SheetTitle>
        )}
        <TaskMeta task={task} />
      </SheetHeader>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4">
        <Description
          value={description}
          onChange={setDescription}
          disabled={busy}
          {...(onSaveDescription === undefined
            ? {}
            : {
                onSave: async () => {
                  setBusyAction('description')
                  setMessage(null)
                  const result = await onSaveDescription(task.id, expectedUpdatedAt, description)
                  setBusyAction(null)
                  setMessage(result.ok ? 'Saved.' : result.error)
                },
              })}
        />
        <Subtasks task={task} />
        {message === null ? null : (
          <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
            {message}
          </p>
        )}
      </div>
      <SheetFooter className="shrink-0 flex-row border-t">
        {onComplete === undefined ? null : (
          <Button className="flex-1" onClick={() => void handleComplete()} disabled={busy}>
            {busyAction === 'complete' ? (terminal ? 'Reopening…' : 'Completing…') : terminal ? 'Reopen' : 'Complete'}
          </Button>
        )}
        <Button className="flex-1" variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      </SheetFooter>
    </>
  )
  if (renderAsPage)
    return (
      <section className="mx-auto flex min-h-[min(720px,calc(100vh-2rem))] max-w-3xl flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
        {detail}
      </section>
    )
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-hidden overscroll-contain sm:max-w-[560px]">
        {detail}
      </SheetContent>
    </Sheet>
  )
}
