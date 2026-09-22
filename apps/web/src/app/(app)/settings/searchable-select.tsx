'use client'

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@ops/ui/components/ui/combobox'

type SelectOption = Readonly<{ value: string; label: string }>

export function SearchableSelect({
  id,
  label,
  value,
  options,
  onChange,
}: Readonly<{
  id: string
  label: string
  value: string
  options: readonly SelectOption[]
  onChange: (value: string) => void
}>) {
  const values = options.map((option) => option.value)
  return (
    <Combobox
      items={values}
      value={value}
      filter={(item, query) => item.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())}
      onValueChange={(nextValue) => {
        onChange(typeof nextValue === 'string' ? nextValue : '')
      }}
    >
      <ComboboxInput id={id} aria-label={label} placeholder={`Search ${label.toLowerCase()}…`} className="w-full" />
      <ComboboxContent>
        <ComboboxEmpty>No matching options.</ComboboxEmpty>
        <ComboboxList>
          {(item) => {
            const value = String(item)
            const option = options.find(({ value: optionValue }) => optionValue === value)
            return (
              <ComboboxItem key={value} value={value}>
                {option?.label ?? value}
              </ComboboxItem>
            )
          }}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
