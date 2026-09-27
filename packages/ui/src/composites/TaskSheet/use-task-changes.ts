'use client'

import { useEffect, useState } from 'react'
import type { TaskChange, TaskSheetActions, TaskSheetTask } from './types'

/** Saves one change at a time against the latest known version and keeps the resulting errors for display. */
export function useTaskChanges(task: TaskSheetTask, onChange: TaskSheetActions['onChange']) {
  const [version, setVersion] = useState(task.updatedAt)
  const [pending, setPending] = useState<TaskChange['kind'] | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [fields, setFields] = useState<Readonly<Record<string, string>>>({})

  useEffect(() => {
    setVersion(task.updatedAt)
  }, [task.updatedAt])

  useEffect(() => {
    setMessage(null)
    setFields({})
  }, [task.id])

  const save = async (change: TaskChange, savedMessage?: string): Promise<boolean> => {
    setPending(change.kind)
    setMessage(null)
    setFields({})
    const result = await onChange({ taskId: task.id, expectedUpdatedAt: version, change })
    setPending(null)
    if (result.ok) {
      if (result.updatedAt !== undefined) setVersion(result.updatedAt)
      if (savedMessage !== undefined) setMessage(savedMessage)
      return true
    }
    setMessage(result.message)
    setFields(result.fields ?? {})
    return false
  }

  return { save, pending, message, fields }
}
