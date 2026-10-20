'use client'

import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/** One select that narrows a task view to a person; the choice is the `assignee` address parameter, so it can be shared. */
export function AssigneeFilter({
  value,
  options,
  label,
  allLabel,
}: Readonly<{
  value: string
  options: readonly { value: string; label: string }[]
  label: string
  allLabel: string
}>) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  return (
    <NativeSelect
      aria-label={label}
      value={value}
      size="sm"
      onChange={(event) => {
        const params = new URLSearchParams(searchParams.toString())
        if (event.target.value === '') params.delete('assignee')
        else params.set('assignee', event.target.value)
        const query = params.toString()
        router.replace(query === '' ? pathname : `${pathname}?${query}`, { scroll: false })
      }}
    >
      <option value="">{allLabel}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </NativeSelect>
  )
}
