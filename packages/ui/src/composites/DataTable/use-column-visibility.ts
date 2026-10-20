'use client'

import { useEffect, useState } from 'react'

type Visibility = Record<string, boolean>

const PREFIX = 'ops-columns:'
const ID_SEGMENT = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

/** The page's route pattern, so every record under `/projects/<id>` shares one saved choice instead of one key each. */
const routeOf = (path: string): string => path.replace(ID_SEGMENT, '/:id')

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
  const key = `${PREFIX}${routeOf(path)}`
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
