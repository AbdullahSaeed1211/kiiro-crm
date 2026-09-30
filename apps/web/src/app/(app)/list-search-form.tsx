'use client'

import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { Search } from 'lucide-react'

export type ListFilter = Readonly<{
  name: string
  label: string
  allLabel: string
  value: string
  options: readonly { value: string; label: string }[]
}>

/** The search box and optional filter dropdown above a list; it submits as a GET form, so the URL holds the state. */
export function ListSearchForm({
  action,
  label,
  query,
  filter,
}: Readonly<{ action: string; label: string; query: string; filter?: ListFilter }>) {
  return (
    <form className="flex max-w-md items-center gap-2" action={action}>
      <Search aria-hidden className="size-4 text-muted-foreground" />
      <input
        name="q"
        aria-label={label}
        defaultValue={query}
        placeholder={`${label}…`}
        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      {filter === undefined ? null : (
        <NativeSelect
          name={filter.name}
          defaultValue={filter.value}
          aria-label={filter.label}
          onChange={(event) => {
            event.currentTarget.form?.requestSubmit()
          }}
        >
          <option value="">{filter.allLabel}</option>
          {filter.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      )}
    </form>
  )
}
