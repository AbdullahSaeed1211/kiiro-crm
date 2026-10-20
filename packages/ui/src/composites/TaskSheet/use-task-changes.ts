'use client'

import { useEffect, useRef, useState } from 'react'
import type { TaskChange, TaskChangeRequest, TaskChangeResult, TaskSheetActions, TaskSheetTask } from './types'

/** How long a "Saved." confirmation stays on screen. */
const SAVED_VISIBLE_MS = 2500

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

/** One fade timer at a time: a newer save, another task or closing the panel cancels the old one. */
function useFadeTimer(taskId: string) {
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => {
    window.clearTimeout(timer.current)
    return () => {
      window.clearTimeout(timer.current)
    }
  }, [taskId])
  return timer
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

  const fadeTimer = useFadeTimer(task.id)

  const save = async (change: TaskChange, savedMessage?: string): Promise<boolean> => {
    window.clearTimeout(fadeTimer.current)
    setPending(change.kind)
    setMessage(null)
    setFields({})
    const result = await attempt(onChange, { taskId: task.id, expectedUpdatedAt: version, change }, failedMessage)
    setPending(null)
    if (result.ok) {
      if (result.updatedAt !== undefined) setVersion(result.updatedAt)
      if (savedMessage !== undefined) {
        setMessage(savedMessage)
        // The confirmation fades, so a later change does not look like it is still showing an old result.
        fadeTimer.current = window.setTimeout(() => {
          setMessage(null)
        }, SAVED_VISIBLE_MS)
      }
      return true
    }
    setMessage(result.message)
    setFields(result.fields ?? {})
    return false
  }

  return { save, pending, message, fields }
}
