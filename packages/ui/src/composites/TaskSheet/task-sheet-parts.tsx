import { Button } from '@ops/ui/components/ui/button'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@ops/ui/components/ui/sheet'
import type { CompleteTaskParams, TaskSheetTask } from './types'

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
  renderAsPage,
}: Readonly<{
  title: string
  task: TaskSheetTask
  renderAsPage: boolean
}>) {
  return (
    <SheetHeader>
      {renderAsPage ? (
        <h1 className="font-heading text-xl font-semibold text-foreground">{title}</h1>
      ) : (
        <SheetTitle>{title}</SheetTitle>
      )}
      <TaskMeta task={task} />
    </SheetHeader>
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
  onComplete: ((params: CompleteTaskParams) => Promise<boolean> | boolean) | undefined
  onOpenChange: (open: boolean) => void
  busyAction: 'description' | 'complete' | null
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

function isTerminalStage(stageCategory: string | undefined): boolean {
  return ['done_success', 'done_failure', 'cancelled'].includes(stageCategory ?? '')
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

function TaskSheetPageWrapper({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <section className="mx-auto flex min-h-[min(720px,calc(100vh-2rem))] max-w-3xl flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      {children}
    </section>
  )
}

function TaskSheetViewWrapper({
  renderAsPage,
  detail,
  open,
  onOpenChange,
}: Readonly<{
  renderAsPage: boolean
  detail: React.ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
}>) {
  if (renderAsPage) return <TaskSheetPageWrapper>{detail}</TaskSheetPageWrapper>
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-hidden overscroll-contain sm:max-w-[560px]">
        {detail}
      </SheetContent>
    </Sheet>
  )
}

export { TaskSheetHeader, TaskSheetFooter, MessageDisplay, TaskSheetViewWrapper, isTerminalStage }
