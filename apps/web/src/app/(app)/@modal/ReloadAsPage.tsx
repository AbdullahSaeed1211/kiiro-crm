'use client'

import { useEffect } from 'react'

/** Loads the current address as a normal page: a full load is never intercepted by the task panel route. */
export function ReloadAsPage() {
  useEffect(() => {
    window.location.reload()
  }, [])
  return null
}
