'use client'

import { useEffect, useState } from 'react'
import type { DataTableColumn } from './types'

type Visibility = Record<string, boolean>

const PREFIX = 'ops-columns:'
const ID_SEGMENT = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

/** The page's route pattern, so every record under `/projects/<id>` shares one saved choice instead of one key each. */
const routeOf = (path: string): string => path.replace(ID_SEGMENT, '/:id')

function read(key: string): Visibility {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? '{}')
    if (typeof parsed !== 'object' || parsed === null) return {}
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'),
    )
  } catch {
    return {}
  }
}

/**
 * Which columns are shown on this page: the defaults, changed by what the person chose, kept in the browser so the
 * table opens the way they left it. Only choices that differ from the defaults are saved. The first render uses the
 * defaults, so server and client markup match; the saved choice applies right after.
 * Storage can be unavailable (private windows, blocked site data); the table then simply forgets on reload.
 */
export function useColumnVisibility(path: string, columns: readonly DataTableColumn[]) {
  const defaults: Visibility = Object.fromEntries(
    columns.filter((column) => column.defaultHidden === true).map((column) => [column.id, false]),
  )
  const key = `${PREFIX}${routeOf(path)}`
  const defaultsKey = JSON.stringify(defaults)
  const [visibility, setVisibility] = useState<Visibility>(defaults)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)

  useEffect(() => {
    setVisibility({ ...(JSON.parse(defaultsKey) as Visibility), ...read(key) })
    setLoadedKey(key)
  }, [key, defaultsKey])

  useEffect(() => {
    if (loadedKey !== key) return
    try {
      const base = JSON.parse(defaultsKey) as Visibility
      const changed = Object.fromEntries(
        Object.entries(visibility).filter(([id, shown]) => shown !== (base[id] ?? true)),
      )
      if (Object.keys(changed).length === 0) window.localStorage.removeItem(key)
      else window.localStorage.setItem(key, JSON.stringify(changed))
    } catch {
      // Not saving is fine; the choice still holds until the page reloads.
    }
  }, [visibility, key, loadedKey, defaultsKey])

  return [visibility, setVisibility] as const
}
