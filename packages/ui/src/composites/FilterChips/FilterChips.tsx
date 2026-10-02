'use client'

import { X } from 'lucide-react'
import { Button } from '@ops/ui/components/ui/button'

export type FilterChip = Readonly<{ id: string; label: string }>

export type FilterChipsLabels = Readonly<{
  /** Accessible name of a chip's remove button, for example "Remove filter: Owner: Me". */
  remove: (label: string) => string
  clearAll: string
  group: string
}>

/** The filters now applied to a list, each removable on its own, plus one control that removes them all. */
export function FilterChips({
  chips,
  labels,
  onRemove,
  onClearAll,
}: Readonly<{
  chips: readonly FilterChip[]
  labels: FilterChipsLabels
  onRemove: (id: string) => void
  onClearAll: () => void
}>) {
  if (chips.length === 0) return null
  return (
    <ul aria-label={labels.group} className="flex min-w-0 flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <li
          key={chip.id}
          className="inline-flex max-w-full items-center gap-1 rounded-full border bg-muted/40 py-0.5 pr-1 pl-2.5 text-xs"
        >
          <span className="truncate">{chip.label}</span>
          <button
            type="button"
            aria-label={labels.remove(chip.label)}
            className="inline-flex size-5 shrink-0 items-center justify-center rounded-full hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            onClick={() => {
              onRemove(chip.id)
            }}
          >
            <X aria-hidden className="size-3" />
          </button>
        </li>
      ))}
      <li>
        <Button type="button" variant="ghost" size="xs" onClick={onClearAll}>
          {labels.clearAll}
        </Button>
      </li>
    </ul>
  )
}
