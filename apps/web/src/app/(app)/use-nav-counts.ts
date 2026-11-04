'use client'

import { useEffect, useState } from 'react'
import { readApi } from './api-client'

type Counts = Readonly<Partial<Record<string, number>>>
const NONE: Counts = {}

/**
 * The counts beside sidebar links. They load after the page and refresh when the person changes page or returns to the
 * tab; until then the links show no count, and a count never takes layout space.
 */
export function useNavCounts(pathname: string): Counts {
  const [counts, setCounts] = useState<Counts>(NONE)
  useEffect(() => {
    let live = true
    const load = () => {
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
