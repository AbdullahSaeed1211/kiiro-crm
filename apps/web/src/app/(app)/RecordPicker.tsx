'use client'

import { Input } from '@ops/ui/components/ui/input'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { useEffect, useState } from 'react'
import { searchRecordOptions, type PickerOptions } from '../../server/crm/pickers'

const SEARCH_DELAY_MS = 250

type Option = PickerOptions['options'][number]

/**
 * A pick list of organizations or contacts that reads the first 100 matches rather than the whole book. When there are
 * more, a search box narrows it. The chosen record stays listed while the search changes.
 */
export function RecordPicker({
  id,
  name,
  type,
  emptyLabel,
}: Readonly<{ id: string; name: string; type: 'organization' | 'contact'; emptyLabel: string }>) {
  const [found, setFound] = useState<PickerOptions>({ options: [], more: false })
  const [query, setQuery] = useState('')
  const [chosen, setChosen] = useState<Option>()
  useEffect(() => {
    let current = true
    const timer = setTimeout(
      () => {
        void searchRecordOptions({ type, query }).then((result) => {
          if (current) setFound(result)
        })
      },
      query === '' ? 0 : SEARCH_DELAY_MS,
    )
    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [type, query])
  const listed =
    chosen === undefined || found.options.some((item) => item.id === chosen.id)
      ? found.options
      : [chosen, ...found.options]
  return (
    <div className="grid gap-1.5">
      {found.more || query !== '' ? (
        <Input
          aria-label={`Search ${type === 'organization' ? 'organizations' : 'contacts'}`}
          placeholder="Type to narrow the list"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
          }}
        />
      ) : null}
      <NativeSelect
        id={id}
        name={name}
        value={chosen?.id ?? ''}
        onChange={(event) => {
          setChosen(listed.find((item) => item.id === event.target.value))
        }}
      >
        <option value="">{emptyLabel}</option>
        {listed.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </NativeSelect>
    </div>
  )
}
