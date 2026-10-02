'use client'

import { useEffect, useState } from 'react'
import type { TaskChange, TaskChangeRequest, TaskChangeResult, TaskSheetActions, TaskSheetTask } from './types'

/** Runs the save; a request that fails before the server answers becomes a failed result, so the panel never hangs. */
async function attempt(
  onChange: TaskSheetActions['onChange'],
  request: TaskChangeRequest,
  failedMessage: string,
): Promise<TaskChangeResult> {
  try {
    return await onChange(request)
  } catch {
    return { ok: false, message: failedMessage }
  }
}

/** Saves one change at a time against the latest known version and keeps the resulting errors for display. */
export function useTaskChanges(task: TaskSheetTask, onChange: TaskSheetActions['onChange'], failedMessage: string) {
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
    const result = await attempt(onChange, { taskId: task.id, expectedUpdatedAt: version, change }, failedMessage)
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
