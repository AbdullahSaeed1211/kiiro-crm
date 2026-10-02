'use client'

import { FilterChips, type FilterChip } from '@ops/ui/composites/FilterChips'
import type { KanbanStage } from '@ops/ui/composites/KanbanBoard'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { catalogFor } from '../../../i18n/locale'
import { useLocale } from '../../../i18n/locale-context'
import { FILTER_CHIPS_COPY, fill, type FilterChipsCopy } from '../../../i18n/filter-chips-copy'

const OWNER_NAMES: Readonly<Record<string, string>> = { me: 'My leads', none: 'Unassigned' }

/** Removes one filter from the list's address, drops the page number, and keeps the others. */
function without(search: URLSearchParams, id: string): string {
  const params = new URLSearchParams(search.toString())
  if (id.startsWith('stage:')) {
    const keep = params.getAll('stage').filter((stage) => stage !== id.slice('stage:'.length))
    params.delete('stage')
    keep.forEach((stage) => {
      params.append('stage', stage)
    })
  } else params.delete(id)
  params.delete('page')
  return params.toString()
}

type Sources = readonly { id: string; name: string }[]

interface ChipInput {
  search: URLSearchParams
  stages: readonly KanbanStage[]
  sources: Sources
  copy: FilterChipsCopy
}

function stageChips({ search, stages, copy }: ChipInput): FilterChip[] {
  return search.getAll('stage').flatMap((id) => {
    const name = stages.find((stage) => stage.id === id)?.name
    return name === undefined ? [] : [{ id: `stage:${id}`, label: fill(copy.stage, { text: name }) }]
  })
}

function facetChips({ search, sources, copy }: ChipInput): FilterChip[] {
  const owner = search.get('owner') ?? ''
  const source = sources.find((item) => item.id === search.get('source'))
  return [
    ...(owner === '' ? [] : [{ id: 'owner', label: fill(copy.owner, { text: OWNER_NAMES[owner] ?? owner }) }]),
    ...(source === undefined ? [] : [{ id: 'source', label: fill(copy.source, { text: source.name }) }]),
  ]
}

function chipsFor(input: ChipInput): FilterChip[] {
  const { search, copy } = input
  const q = search.get('q') ?? ''
  const text = q === '' ? [] : [{ id: 'q', label: fill(copy.search, { text: q }) }]
  return [...text, ...stageChips(input), ...facetChips(input)]
}

/** One removable chip for each search, stage, owner and source filter now applied to the lead list. */
export function LeadFilterChips({ stages, sources }: Readonly<{ stages: readonly KanbanStage[]; sources: Sources }>) {
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()
  const copy = catalogFor(FILTER_CHIPS_COPY, useLocale())
  return (
    <FilterChips
      chips={chipsFor({ search, stages, sources, copy })}
      labels={{ group: copy.group, clearAll: copy.clearAll, remove: (label) => fill(copy.remove, { label }) }}
      onRemove={(id) => {
        router.push(`${pathname}?${without(search, id)}`)
      }}
      onClearAll={() => {
        router.push(pathname)
      }}
    />
  )
}
