'use client'

import { useEffect, useState } from 'react'

type Visibility = Record<string, boolean>

const PREFIX = 'ops-columns:'

function read(key: string): Visibility {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? '{}')
    if (typeof parsed !== 'object' || parsed === null) return {}
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, boolean] => entry[1] === false))
  } catch {
    return {}
  }
}

/**
 * Which columns the person hid on this page, kept in the browser so the table opens the way they left it.
 * The first render shows every column, so server and client markup match; the saved choice applies right after.
 * Storage can be unavailable (private windows, blocked site data); the table then simply forgets on reload.
 */
export function useColumnVisibility(path: string) {
  const key = `${PREFIX}${path}`
  const [visibility, setVisibility] = useState<Visibility>({})
  const [loadedKey, setLoadedKey] = useState<string | null>(null)

  useEffect(() => {
    setVisibility(read(key))
    setLoadedKey(key)
  }, [key])

  useEffect(() => {
    if (loadedKey !== key) return
    try {
      const hidden = Object.fromEntries(Object.entries(visibility).filter(([, shown]) => !shown))
      if (Object.keys(hidden).length === 0) window.localStorage.removeItem(key)
      else window.localStorage.setItem(key, JSON.stringify(hidden))
    } catch {
      // Not saving is fine; the choice still holds until the page reloads.
    }
  }, [visibility, key, loadedKey])

  return [visibility, setVisibility] as const
}
