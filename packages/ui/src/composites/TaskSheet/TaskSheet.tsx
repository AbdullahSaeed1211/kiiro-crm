'use client'

import { Sheet, SheetContent } from '@ops/ui/components/ui/sheet'
import { TaskSheetContent } from './task-sheet-content'
import type { CompleteTaskParams, SaveDescriptionParams, TaskSaveResult, TaskSheetTask } from './types'

export type { TaskSheetTask } from './types'
export { TaskSheetContent } from './task-sheet-content'

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
  onSaveDescription?: (params: SaveDescriptionParams) => Promise<TaskSaveResult> | TaskSaveResult
  onComplete?: (params: CompleteTaskParams) => Promise<boolean> | boolean
}>) {
  if (!task) return null
  const props = {
    task,
    onOpenChange,
    renderAsPage: false as const,
    ...(onSaveDescription && { onSaveDescription }),
    ...(onComplete && { onComplete }),
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-hidden overscroll-contain sm:max-w-[560px] flex flex-col p-0"
      >
        <TaskSheetContent {...props} />
      </SheetContent>
    </Sheet>
  )
}

export function TaskPage({
  task,
  onSaveDescription,
  onComplete,
}: Readonly<{
  task: TaskSheetTask | null
  onSaveDescription?: (params: SaveDescriptionParams) => Promise<TaskSaveResult> | TaskSaveResult
  onComplete?: (params: CompleteTaskParams) => Promise<boolean> | boolean
}>) {
  if (!task) return null
  const props = {
    task,
    onOpenChange: () => {
      // Page view doesn't need to handle open state changes
    },
    renderAsPage: true as const,
    ...(onSaveDescription && { onSaveDescription }),
    ...(onComplete && { onComplete }),
  }
  return (
    <div className="flex flex-col overflow-hidden">
      <TaskSheetContent {...props} />
    </div>
  )
}
