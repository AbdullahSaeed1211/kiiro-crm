'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@ops/ui/components/ui/sheet'
import { Textarea } from '@ops/ui/components/ui/textarea'
import { useState } from 'react'

export interface TaskSheetTask {
  readonly id: string
  readonly title: string
  readonly stage: string
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
}: Readonly<{ value: string; onChange: (value: string) => void; onSave?: (value: string) => void }>) {
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
          onSave?.(value)
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
  onSaveDescription?: (description: string) => void
  onComplete?: () => void
}>) {
  const [description, setDescription] = useState(task?.description ?? '')
  if (task === null) return null
  const handleComplete = () => {
    onComplete?.()
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
            {...(onSaveDescription === undefined ? {} : { onSave: onSaveDescription })}
          />
          <Subtasks task={task} />
        </div>
        <SheetFooter>
          <Button onClick={handleComplete}>{task.stage.toLowerCase() === 'done' ? 'Reopen' : 'Complete'}</Button>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
