'use client'

import { Button } from '@ops/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@ops/ui/components/ui/dropdown-menu'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { FilterBar } from '@ops/ui/composites/FilterBar'
import { ArrowDownUp } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

type Option = Readonly<{ value: string; label: string }>

export type ListFilter = Readonly<{
  name: string
  label: string
  allLabel: string
  value: string
  options: readonly Option[]
}>
export type ListSort = Readonly<{ value: string; options: readonly Option[] }>

/** Rewrites one query parameter (dropping paging) and navigates, so the URL always holds the list's state. */
function useQueryParam() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  return ({ name, value, replace = false }: Readonly<{ name: string; value: string; replace?: boolean }>) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('page')
    if (value === '') params.delete(name)
    else params.set(name, value)
    const target = `${pathname}?${params.toString()}`
    if (replace) router.replace(target)
    else router.push(target, { scroll: false })
  }
}

function SortMenu({ sort, onChange }: Readonly<{ sort: ListSort; onChange: (value: string) => void }>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <ArrowDownUp aria-hidden />
        Sort
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuRadioGroup value={sort.value} onValueChange={onChange}>
          {sort.options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** The one bar above every record list: search, any number of filters, and an optional sort menu. */
export function ListViewBar({
  searchLabel,
  query,
  filters = [],
  sort,
}: Readonly<{ searchLabel: string; query: string; filters?: readonly ListFilter[]; sort?: ListSort }>) {
  const setParam = useQueryParam()
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <FilterBar
        query={query}
        stages={[]}
        labels={{
          search: searchLabel,
          searchPlaceholder: `${searchLabel}…`,
          stage: 'Filters',
          clear: 'Clear',
          noStages: 'No stage filters here',
        }}
        onQueryChange={(value) => {
          setParam({ name: 'q', value: value.trim(), replace: true })
        }}
        onStagesChange={() => undefined}
        showStageFilter={false}
        className="min-w-48 flex-1"
      />
      {filters.map((filter) => (
        <NativeSelect
          key={filter.name}
          size="sm"
          aria-label={filter.label}
          value={filter.value}
          onChange={(event) => {
            setParam({ name: filter.name, value: event.target.value })
          }}
        >
          <option value="">{filter.allLabel}</option>
          {filter.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      ))}
      {sort === undefined ? null : (
        <SortMenu
          sort={sort}
          onChange={(value) => {
            setParam({ name: 'sort', value })
          }}
        />
      )}
    </div>
  )
}
