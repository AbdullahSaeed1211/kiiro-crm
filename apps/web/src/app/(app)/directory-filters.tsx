'use client'

import { FilterBar } from '@ops/ui/composites/FilterBar'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback } from 'react'

export function DirectoryFilters({ query }: Readonly<{ query: string }>) {
  const router = useRouter()
  const pathname = usePathname()
  const update = useCallback(
    (nextQuery: string) => {
      const params = new URLSearchParams()
      if (nextQuery.trim() !== '') params.set('q', nextQuery.trim())
      router.replace(`${pathname}?${params.toString()}`)
    },
    [pathname, router],
  )
  return (
    <FilterBar
      query={query}
      stages={[]}
      labels={{
        search: 'Search',
        searchPlaceholder: 'Search people and companies…',
        stage: 'Filters',
        clear: 'Clear',
        noStages: 'No stage filters for this directory',
      }}
      onQueryChange={update}
      onStagesChange={() => undefined}
      className="border-y py-3"
    />
  )
}
