'use client'

import { useEffect, useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@ops/ui/components/ui/button'
import { Checkbox } from '@ops/ui/components/ui/checkbox'
import { Input } from '@ops/ui/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@ops/ui/components/ui/popover'
import { cn } from '@ops/ui/lib/utils'
import { stageDotClass, type StageOption } from '../StagePill/stage'
import { hasActiveFilters, normalizeStages, toggleStage } from './filter'

export type FilterBarLabels = Readonly<{
  search: string
  searchPlaceholder: string
  stage: string
  clear: string
  noStages: string
}>

export type FilterBarProps = Readonly<{
  query: string
  stages: readonly string[]
  stageOptions?: readonly StageOption[]
  labels: FilterBarLabels
  onQueryChange: (query: string) => void
  onStagesChange: (stageIds: readonly string[]) => void
  debounceMs?: number
  className?: string | undefined
}>

/** Search and multi-stage controls for server-filtered list pages. */
export function FilterBar({
  query,
  stages,
  stageOptions = [],
  labels,
  onQueryChange,
  onStagesChange,
  debounceMs = 300,
  className,
}: FilterBarProps) {
  const [draftQuery, setDraftQuery] = useState(query)
  const [draftStages, setDraftStages] = useState(() => normalizeStages(stages))
  useEffect(() => {
    setDraftQuery(query)
  }, [query])
  useEffect(() => {
    setDraftStages(normalizeStages(stages))
  }, [stages])
  useEffect(() => {
    if (draftQuery === query) return
    const timer = window.setTimeout(() => {
      onQueryChange(draftQuery)
    }, debounceMs)
    return () => {
      window.clearTimeout(timer)
    }
  }, [debounceMs, draftQuery, onQueryChange, query])
  const active = hasActiveFilters(draftQuery, draftStages)
  const clear = () => {
    setDraftQuery('')
    setDraftStages([])
    onQueryChange('')
    onStagesChange([])
  }
  const chooseStage = (stageId: string) => {
    const next = toggleStage(draftStages, stageId)
    setDraftStages(next)
    onStagesChange(next)
  }
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div className="relative min-w-48 flex-1 md:max-w-sm">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          aria-label={labels.search}
          placeholder={labels.searchPlaceholder}
          value={draftQuery}
          onChange={(event) => {
            setDraftQuery(event.target.value)
          }}
          className="pl-8"
        />
      </div>
      <Popover>
        <PopoverTrigger render={<Button type="button" variant="outline" size="sm" />}>
          <SlidersHorizontal aria-hidden />
          {labels.stage}
          {draftStages.length > 0 ? <span className="text-xs tabular-nums">({draftStages.length})</span> : null}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64">
          {stageOptions.length === 0 ? <p className="p-1 text-sm text-muted-foreground">{labels.noStages}</p> : null}
          {stageOptions.map((stage) => (
            <label
              key={stage.id}
              className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-muted"
            >
              <Checkbox
                checked={draftStages.includes(stage.id)}
                onCheckedChange={() => {
                  chooseStage(stage.id)
                }}
              />
              <span aria-hidden className={cn('size-2 shrink-0 rounded-full', stageDotClass(stage.color))} />
              <span className="truncate">{stage.name}</span>
            </label>
          ))}
        </PopoverContent>
      </Popover>
      {active ? (
        <Button type="button" variant="ghost" size="sm" onClick={clear}>
          <X aria-hidden />
          {labels.clear}
        </Button>
      ) : null}
    </div>
  )
}
