'use client'

import { useEffect, useState } from 'react'
import { readApi } from './api-client'

type Counts = Readonly<Partial<Record<string, number>>>
const NONE: Counts = {}
const MIN_GAP_MS = 30_000
// Shared across renders and remounts: when the counts were last asked for.
const lastLoad = { at: 0 }

/**
 * The counts beside sidebar links. They load after the page and refresh when the person changes page or returns to the
 * tab; until then the links show no count, and a count never takes layout space.
 */
export function useNavCounts(pathname: string): Counts {
  const [counts, setCounts] = useState<Counts>(NONE)
  useEffect(() => {
    let live = true
    const load = () => {
      // A person moving between pages should not cost a request each time.
      if (Date.now() - lastLoad.at < MIN_GAP_MS) return
      lastLoad.at = Date.now()
      void fetch('/api/v1/nav/counts', { credentials: 'same-origin' })
        .then((response) => readApi<Counts>(response, 'Counts failed.'))
        .then((result) => {
          if (live && result.ok) setCounts(result.data)
        })
        .catch(() => undefined)
    }
    load()
    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      live = false
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [pathname])
  return counts
}
