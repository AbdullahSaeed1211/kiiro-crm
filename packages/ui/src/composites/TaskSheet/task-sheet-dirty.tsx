'use client'

import { createContext, useContext, useEffect } from 'react'

type DirtyChange = (editor: string, dirty: boolean) => void

const TaskSheetDirtyContext = createContext<DirtyChange>(() => undefined)

export const TaskSheetDirtyProvider = TaskSheetDirtyContext.Provider

/** Registers local editor drafts with the enclosing sheet close guard. */
export function useTaskSheetDirtyChange(editor: string, dirty: boolean) {
  const onDirtyChange = useContext(TaskSheetDirtyContext)
  useEffect(() => {
    onDirtyChange(editor, dirty)
    return () => {
      onDirtyChange(editor, false)
    }
  }, [dirty, editor, onDirtyChange])
}
