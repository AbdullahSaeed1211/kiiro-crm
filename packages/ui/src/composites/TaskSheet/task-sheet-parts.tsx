import { Button } from '@ops/ui/components/ui/button'
import { SheetFooter, SheetHeader, SheetTitle } from '@ops/ui/components/ui/sheet'
import type { CompleteTaskParams, TaskSheetTask } from './types'

type BusyAction = 'description' | 'complete' | null
type CompleteHandler = (params: CompleteTaskParams) => Promise<boolean> | boolean

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

function TaskSheetHeader({
  title,
  task,
}: Readonly<{
  title: string
  task: TaskSheetTask
}>) {
  return (
    <SheetHeader>
      <SheetTitle>{title}</SheetTitle>
      <TaskMeta task={task} />
    </SheetHeader>
  )
}

function TaskPageHeader({
  title,
  task,
}: Readonly<{
  title: string
  task: TaskSheetTask
}>) {
  return (
    <div className="border-b">
      <div className="px-4 py-3">
        <p className="text-xs font-medium text-muted-foreground mb-1">Task</p>
        <h1 className="font-heading text-xl font-semibold text-foreground">{title}</h1>
        <TaskMeta task={task} />
      </div>
    </div>
  )
}

function TaskSheetFooter({
  onComplete,
  onOpenChange,
  busyAction,
  terminal,
  busy,
  handleComplete,
}: Readonly<{
  onComplete: CompleteHandler | undefined
  onOpenChange: (open: boolean) => void
  busyAction: BusyAction
  terminal: boolean
  busy: boolean
  handleComplete: () => Promise<void>
}>) {
  return (
    <SheetFooter className="shrink-0 flex-row border-t">
      {onComplete === undefined ? null : (
        <Button className="flex-1" onClick={() => void handleComplete()} disabled={busy}>
          {getCompleteButtonLabel(busyAction, terminal)}
        </Button>
      )}
      <Button
        className="flex-1"
        variant="outline"
        onClick={() => {
          onOpenChange(false)
        }}
      >
        Close
      </Button>
    </SheetFooter>
  )
}

function TaskPageFooter({
  onComplete,
  busyAction,
  terminal,
  busy,
  handleComplete,
}: Readonly<{
  onComplete: CompleteHandler | undefined
  busyAction: BusyAction
  terminal: boolean
  busy: boolean
  handleComplete: () => Promise<void>
}>) {
  return (
    <div className="border-t px-4 py-3 flex-row gap-2">
      {onComplete === undefined ? null : (
        <Button onClick={() => void handleComplete()} disabled={busy}>
          {getCompleteButtonLabel(busyAction, terminal)}
        </Button>
      )}
    </div>
  )
}

function getCompleteButtonLabel(busyAction: 'description' | 'complete' | null, terminal: boolean): string {
  if (busyAction === 'complete') {
    return terminal ? 'Reopening…' : 'Completing…'
  }
  return terminal ? 'Reopen' : 'Complete'
}

function MessageDisplay({ message }: Readonly<{ message: string | null }>) {
  if (message === null) return null
  return (
    <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
      {message}
    </p>
  )
}

export { TaskSheetHeader, TaskPageHeader, TaskSheetFooter, TaskPageFooter, MessageDisplay }
