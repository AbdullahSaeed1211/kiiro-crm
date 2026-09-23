'use client'

import { Button } from '@ops/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@ops/ui/components/ui/dropdown-menu'
import { FilterBar } from '@ops/ui/composites/FilterBar'
import { ArrowDownUp } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import type { DirectorySort } from '../../server/crm/directory/utils'

const SORT_OPTIONS: readonly { value: DirectorySort; label: string }[] = [
  { value: 'name', label: 'Name: A to Z' },
  { value: '-name', label: 'Name: Z to A' },
  { value: '-updatedAt', label: 'Recently updated' },
  { value: 'updatedAt', label: 'Least recently updated' },
]

export function DirectoryFilters({
  query,
  kind,
  sort,
}: Readonly<{ query: string; kind: 'organizations' | 'contacts'; sort: DirectorySort }>) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [sortOpen, setSortOpen] = useState(false)
  const chooseSort = (next: DirectorySort) => {
    setSortOpen(false)
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort', next)
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }
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
    <div className="flex min-w-0 flex-wrap items-center gap-2">
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
        className="min-w-48 flex-1"
      />
      <DropdownMenu open={sortOpen} onOpenChange={setSortOpen}>
        <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" />}>
          <ArrowDownUp aria-hidden />
          Sort
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuRadioGroup
            value={sort}
            onValueChange={(value) => {
              const option = SORT_OPTIONS.find((entry) => entry.value === value)
              if (option !== undefined) chooseSort(option.value)
            }}
          >
            {SORT_OPTIONS.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
