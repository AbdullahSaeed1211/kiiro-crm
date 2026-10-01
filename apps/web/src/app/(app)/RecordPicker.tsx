'use client'

import { Input } from '@ops/ui/components/ui/input'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { useEffect, useState } from 'react'
import { catalogFor } from '../../i18n/locale'
import { useLocale } from '../../i18n/locale-context'
import { RECORD_PICKER_COPY } from '../../i18n/record-picker-copy'
import { searchRecordOptions, type PickerOptions } from '../../server/crm/pickers'

const SEARCH_DELAY_MS = 250

type Option = PickerOptions['options'][number]

/** The records matching the typed text (the first 100 when it is empty), searched a moment after typing stops. */
function useRecordSearch(type: 'organization' | 'contact') {
  const [found, setFound] = useState<PickerOptions>({ options: [], more: false })
  const [query, setQuery] = useState('')
  useEffect(() => {
    let current = true
    const timer = setTimeout(
      () => {
        void searchRecordOptions({ type, query })
          .then((result) => {
            if (current) setFound(result)
          })
          .catch(() => undefined)
      },
      query === '' ? 0 : SEARCH_DELAY_MS,
    )
    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [type, query])
  return { found, query, setQuery }
}

/** The options, with the chosen record added at the top when the current search no longer lists it. */
function withChosen(options: readonly Option[], chosen: Option | undefined): readonly Option[] {
  return chosen === undefined || options.some((item) => item.id === chosen.id) ? options : [chosen, ...options]
}

/**
 * A pick list of organizations or contacts that reads the first 100 matches rather than the whole book. When there are
 * more, a search box narrows it. The chosen record stays listed while the search changes.
 */
export function RecordPicker({
  id,
  name,
  type,
  emptyLabel,
  label,
  onChoose,
}: Readonly<{
  id: string
  name: string
  type: 'organization' | 'contact'
  emptyLabel: string
  /** Names the list for screen readers when no visible label points at it. */
  label?: string
  /** Called with the chosen record, or undefined when the empty choice is picked. */
  onChoose?: (option: Option | undefined) => void
}>) {
  const copy = catalogFor(RECORD_PICKER_COPY, useLocale())
  const { found, query, setQuery } = useRecordSearch(type)
  const [chosen, setChosen] = useState<Option>()
  const listed = withChosen(found.options, chosen)
  return (
    <div className="grid gap-1.5">
      {found.more || query !== '' ? (
        <Input
          aria-label={type === 'organization' ? copy.searchOrganizations : copy.searchContacts}
          placeholder={copy.narrow}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
          }}
        />
      ) : null}
      <NativeSelect
        id={id}
        name={name}
        {...(label === undefined ? {} : { 'aria-label': label })}
        value={chosen?.id ?? ''}
        onChange={(event) => {
          const next = listed.find((item) => item.id === event.target.value)
          setChosen(next)
          onChoose?.(next)
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
