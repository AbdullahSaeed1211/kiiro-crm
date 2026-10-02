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
import { FilterChips, type FilterChip } from '@ops/ui/composites/FilterChips'
import { catalogFor } from '../../i18n/locale'
import { useLocale } from '../../i18n/locale-context'
import { FILTER_CHIPS_COPY, fill } from '../../i18n/filter-chips-copy'
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

/** One chip for the search text and one for each filter that is not on its "all" choice. */
function chipsFor(input: Readonly<{ query: string; filters: readonly ListFilter[]; search: string }>) {
  const chips: FilterChip[] = []
  if (input.query.trim() !== '') chips.push({ id: 'q', label: fill(input.search, { text: input.query.trim() }) })
  for (const filter of input.filters) {
    const choice = filter.options.find((option) => option.value === filter.value)
    if (filter.value !== '' && choice !== undefined) {
      chips.push({ id: filter.name, label: `${filter.label}: ${choice.label}` })
    }
  }
  return chips
}

/** The one bar above every record list: search, any number of filters, and an optional sort menu. */
export function ListViewBar({
  searchLabel,
  query,
  filters = [],
  sort,
}: Readonly<{ searchLabel: string; query: string; filters?: readonly ListFilter[]; sort?: ListSort }>) {
  const setParam = useQueryParam()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const copy = catalogFor(FILTER_CHIPS_COPY, useLocale())
  const clearAll = () => {
    const params = new URLSearchParams(searchParams.toString())
    for (const name of ['q', 'page', ...filters.map((filter) => filter.name)]) params.delete(name)
    router.push(params.size === 0 ? pathname : `${pathname}?${params.toString()}`, { scroll: false })
  }
  return (
    <div className="grid min-w-0 gap-2">
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
          showClear={false}
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
      <FilterChips
        chips={chipsFor({ query, filters, search: copy.search })}
        labels={{ group: copy.group, clearAll: copy.clearAll, remove: (label) => fill(copy.remove, { label }) }}
        onRemove={(id) => {
          setParam({ name: id, value: '' })
        }}
        onClearAll={clearAll}
      />
    </div>
  )
}
