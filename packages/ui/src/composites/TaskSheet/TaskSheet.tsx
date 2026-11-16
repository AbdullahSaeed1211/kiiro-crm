'use client'

import { Sheet, SheetContent } from '@ops/ui/components/ui/sheet'
import { useCallback, useEffect, useRef, useState } from 'react'
import { TaskSheetContent, type CloseGuard, type TaskViewProps } from './task-sheet-content'

/** Closing with unsaved editor drafts asks first; the first request only shows the question. */
function useCloseGuard(onClose: () => void): { guard: CloseGuard; requestClose: () => void } {
  const dirtyEditors = useRef(new Set<string>())
  const [dirty, setDirty] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const onDirtyChange = useCallback((editor: string, dirty: boolean) => {
    const next = new Set(dirtyEditors.current)
    if (dirty) next.add(editor)
    else next.delete(editor)
    dirtyEditors.current = next
    setDirty(next.size > 0)
    if (next.size === 0) setConfirming(false)
  }, [])
  const requestClose = () => {
    if (dirtyEditors.current.size > 0) setConfirming(true)
    else onClose()
  }
  const guard: CloseGuard = {
    onDirtyChange,
    dirty,
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

function usePageDirtyGuard(): CloseGuard {
  const dirtyEditors = useRef(new Set<string>())
  const [dirty, setDirty] = useState(false)
  const onDirtyChange = useCallback((editor: string, isDirty: boolean) => {
    const next = new Set(dirtyEditors.current)
    if (isDirty) next.add(editor)
    else next.delete(editor)
    dirtyEditors.current = next
    setDirty(next.size > 0)
  }, [])
  useEffect(() => {
    if (!dirty) return
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warnBeforeLeave)
    return () => {
      window.removeEventListener('beforeunload', warnBeforeLeave)
    }
  }, [dirty])
  return {
    onDirtyChange,
    dirty,
    confirming: false,
    onKeep: noop,
    onDiscard: noop,
  }
}

/** The same task detail as a full page under the app header. */
export function TaskPage(props: TaskViewProps) {
  const guard = usePageDirtyGuard()
  return (
    <div className="mx-auto flex h-[calc(100dvh-7rem)] min-h-[20rem] w-full max-w-3xl flex-col overflow-hidden">
      <TaskSheetContent {...props} asPage onClose={noop} guard={guard} />
    </div>
  )
}
