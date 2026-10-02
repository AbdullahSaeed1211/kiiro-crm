'use client'

import { FilterBar } from '@ops/ui'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import type { KanbanStage } from '@ops/ui/composites/KanbanBoard'

const OWNER_OPTIONS = [
  { value: '', label: 'Any owner' },
  { value: 'me', label: 'My leads' },
  { value: 'none', label: 'Unassigned' },
] as const

function FacetSelect({
  label,
  value,
  options,
  onChange,
}: Readonly<{
  label: string
  value: string
  options: readonly { value: string; label: string }[]
  onChange: (value: string) => void
}>) {
  return (
    <NativeSelect
      size="sm"
      aria-label={label}
      value={value}
      onChange={(event) => {
        onChange(event.target.value)
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </NativeSelect>
  )
}

export function LeadListControls({
  stages,
  sources,
}: Readonly<{ stages: readonly KanbanStage[]; sources: readonly { id: string; name: string }[] }>) {
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()
  const q = search.get('q') ?? ''
  const selected = search.getAll('stage')
  const setFacet = (name: 'source' | 'owner', value: string) => {
    const params = new URLSearchParams(search.toString())
    if (value) params.set(name, value)
    else params.delete(name)
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }
  const navigate = useCallback(
    (input: Readonly<{ query: string; stages: readonly string[] }>) => {
      const { query, stages } = input
      const params = new URLSearchParams(search.toString())
      if (query) params.set('q', query)
      else params.delete('q')
      params.delete('stage')
      stages.forEach((stage) => {
        params.append('stage', stage)
      })
      params.delete('view')
      router.push(`${pathname}?${params.toString()}`)
    },
    [pathname, router, search],
  )
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterBar
        query={q}
        stages={selected}
        stageOptions={stages}
        labels={{
          search: 'Search leads',
          searchPlaceholder: 'Search leads…',
          stage: 'Stage',
          clear: 'Clear',
          noStages: 'No stages',
        }}
        onQueryChange={(value) => {
          navigate({ query: value, stages: selected })
        }}
        onStagesChange={(value) => {
          navigate({ query: q, stages: value })
        }}
      />
      <FacetSelect
        label="Owner"
        value={search.get('owner') ?? ''}
        options={OWNER_OPTIONS}
        onChange={(value) => {
          setFacet('owner', value)
        }}
      />
      <FacetSelect
        label="Source"
        value={search.get('source') ?? ''}
        options={[{ value: '', label: 'Any source' }, ...sources.map(({ id, name }) => ({ value: id, label: name }))]}
        onChange={(value) => {
          setFacet('source', value)
        }}
      />
    </div>
  )
}
