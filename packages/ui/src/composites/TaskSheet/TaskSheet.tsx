'use client'

import { Sheet, SheetContent } from '@ops/ui/components/ui/sheet'
import { useCallback, useRef, useState } from 'react'
import { TaskSheetContent, type CloseGuard, type TaskViewProps } from './task-sheet-content'

/** Closing with an unsaved description asks first; the first request only shows the question. */
function useCloseGuard(onClose: () => void): { guard: CloseGuard; requestClose: () => void } {
  const dirty = useRef(false)
  const [confirming, setConfirming] = useState(false)
  const onDirtyChange = useCallback((next: boolean) => {
    dirty.current = next
    if (!next) setConfirming(false)
  }, [])
  const requestClose = () => {
    if (dirty.current) setConfirming(true)
    else onClose()
  }
  const guard: CloseGuard = {
    onDirtyChange,
    confirming,
    onKeep: () => {
      setConfirming(false)
    },
    onDiscard: onClose,
  }
  return { guard, requestClose }
}

/**
 * The visible link that opens this task, if the page behind the panel has one. Closing focuses it directly:
 * Safari does not focus a tapped link, so the default "focus what was focused before" lands on the page body.
 */
function taskTrigger(taskId: string): HTMLElement | null {
  const links = document.querySelectorAll<HTMLElement>(`[data-task-link-id="${CSS.escape(taskId)}"]`)
  return [...links].find((link) => link.getClientRects().length > 0) ?? null
}

/** Task detail in a right-side panel over the page that opened it. */
export function TaskSheet({ onClose, ...props }: TaskViewProps & Readonly<{ onClose: () => void }>) {
  const { guard, requestClose } = useCloseGuard(onClose)
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) requestClose()
      }}
    >
      <SheetContent
        side="right"
        finalFocus={() => taskTrigger(props.task.id) ?? true}
        className="flex w-full flex-col overflow-hidden overscroll-contain p-0 sm:max-w-[560px]"
      >
        <TaskSheetContent {...props} asPage={false} onClose={requestClose} guard={guard} />
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
