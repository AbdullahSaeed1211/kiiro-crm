'use client'

import { FilterBar } from '@ops/ui/composites/FilterBar'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export function DirectoryFilters({ query, kind }: Readonly<{ query: string; kind: 'organizations' | 'contacts' }>) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const update = useCallback(
    (nextQuery: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('page')
      if (nextQuery.trim() !== '') params.set('q', nextQuery.trim())
      else params.delete('q')
      router.replace(`${pathname}?${params.toString()}`)
    },
    [pathname, router, searchParams],
  )
  return (
    <FilterBar
      query={query}
      stages={[]}
      labels={{
        search: 'Search',
        searchPlaceholder: kind === 'organizations' ? 'Search organizations…' : 'Search contacts…',
        stage: 'Filters',
        clear: 'Clear',
        noStages: 'No stage filters for this directory',
      }}
      onQueryChange={update}
      onStagesChange={() => undefined}
      showStageFilter={false}
      className="w-full"
    />
  )
}
