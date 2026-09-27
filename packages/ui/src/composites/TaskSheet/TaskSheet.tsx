'use client'

import { Sheet, SheetContent } from '@ops/ui/components/ui/sheet'
import { TaskSheetContent, type TaskViewProps } from './task-sheet-content'

/** Task detail in a right-side panel over the page that opened it. */
export function TaskSheet({ onClose, ...props }: TaskViewProps & Readonly<{ onClose: () => void }>) {
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col overflow-hidden overscroll-contain p-0 sm:max-w-[560px]"
      >
        <TaskSheetContent {...props} asPage={false} onClose={onClose} />
      </SheetContent>
    </Sheet>
  )
}

const noop = () => undefined

/** The same task detail as a full page under the app header. */
export function TaskPage(props: TaskViewProps) {
  return (
    <div className="flex flex-col overflow-hidden">
      <TaskSheetContent {...props} asPage onClose={noop} />
    </div>
  )
}
