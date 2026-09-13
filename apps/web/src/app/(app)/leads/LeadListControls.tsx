'use client'

import { FilterBar } from '@ops/ui'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import type { KanbanStage } from '@ops/ui/composites/KanbanBoard'

export function LeadListControls({ stages }: Readonly<{ stages: readonly KanbanStage[] }>) {
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()
  const q = search.get('q') ?? ''
  const selected = search.getAll('stage')
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
      <a
        className="inline-flex h-7 items-center rounded-lg border border-border px-2.5 text-sm font-medium hover:bg-muted"
        href="/leads?view=board"
      >
        Board
      </a>
      <a
        className="inline-flex h-7 items-center rounded-lg border border-border px-2.5 text-sm font-medium hover:bg-muted"
        href="/leads"
      >
        Table
      </a>
    </div>
  )
}
