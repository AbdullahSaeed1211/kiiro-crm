'use client'

import { Button } from '../../components/ui/button'
import { Calendar } from '../../components/ui/calendar'
import { Command, CommandInput, CommandItem, CommandList } from '../../components/ui/command'
import { Input } from '../../components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover'
import { CalendarDays, Search, UserRound } from 'lucide-react'

export function UserPicker({
  users,
  value,
  onChange,
  placeholder = 'Choose a user',
}: Readonly<{
  users: readonly { readonly id: string; readonly name: string }[]
  value?: string
  onChange: (id: string) => void
  placeholder?: string
}>) {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="sm" className="justify-start" />}>
        <UserRound aria-hidden className="mr-2 size-4" />
        {users.find((user) => user.id === value)?.name ?? placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1">
        <Command>
          <CommandInput placeholder="Search people" />
          <CommandList>
            {users.map((user) => (
              <CommandItem
                key={user.id}
                value={user.name}
                onSelect={() => {
                  onChange(user.id)
                }}
              >
                {user.name}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function RecordPicker({
  records,
  value,
  onChange,
  placeholder = 'Choose a record',
}: Readonly<{
  records: readonly { readonly id: string; readonly title: string }[]
  value?: string
  onChange: (id: string) => void
  placeholder?: string
}>) {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="sm" className="justify-start" />}>
        <Search aria-hidden className="mr-2 size-4" />
        {records.find((record) => record.id === value)?.title ?? placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-1">
        <Command>
          <CommandInput placeholder="Search records" />
          <CommandList>
            {records.map((record) => (
              <CommandItem
                key={record.id}
                value={record.title}
                onSelect={() => {
                  onChange(record.id)
                }}
              >
                {record.title}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function DateField({
  value,
  onChange,
  placeholder = 'Select date',
}: Readonly<{ value?: Date; onChange: (value: Date | undefined) => void; placeholder?: string }>) {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="sm" className="justify-start" />}>
        <CalendarDays aria-hidden className="mr-2 size-4" />
        {value?.toLocaleDateString() ?? placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar mode="single" selected={value} onSelect={onChange} />
      </PopoverContent>
    </Popover>
  )
}

export function MoneyField({
  value,
  currency,
  onChange,
}: Readonly<{ value?: number; currency: string; onChange: (value: number | undefined) => void }>) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{currency}</span>
      <Input
        inputMode="decimal"
        value={value ?? ''}
        onChange={(event) => {
          onChange(event.target.value === '' ? undefined : Number(event.target.value))
        }}
      />
    </div>
  )
}

export function CustomFieldsForm({
  fields,
  values,
  onChange,
}: Readonly<{
  fields: readonly { readonly key: string; readonly label: string; readonly type?: 'text' | 'number' | 'longText' }[]
  values: Readonly<Record<string, string | number | undefined>>
  onChange: (key: string, value: string | number) => void
}>) {
  return (
    <div className="grid gap-3">
      {fields.map((field) =>
        field.type === 'longText' ? (
          <label key={field.key} className="grid gap-1 text-sm">
            <span>{field.label}</span>
            <textarea
              className="min-h-20 rounded-md border bg-background p-2"
              value={String(values[field.key] ?? '')}
              onChange={(event) => {
                onChange(field.key, event.target.value)
              }}
            />
          </label>
        ) : (
          <label key={field.key} className="grid gap-1 text-sm">
            <span>{field.label}</span>
            <Input
              type={field.type === 'number' ? 'number' : 'text'}
              value={values[field.key] ?? ''}
              onChange={(event) => {
                onChange(field.key, field.type === 'number' ? Number(event.target.value) : event.target.value)
              }}
            />
          </label>
        ),
      )}
    </div>
  )
}
