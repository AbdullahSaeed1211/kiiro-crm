'use client'

import { Input } from '@ops/ui/components/ui/input'
import { DateField } from '@ops/ui/composites/DateField/DateField'
import type { CallingCopy } from '../../../i18n/calling-copy'

export function DateAndTime({
  label,
  date,
  time,
  locale,
  copy,
  pending,
  onDate,
  onTime,
}: Readonly<{
  label: string
  date: number | null
  time: string
  locale: string
  copy: CallingCopy
  pending: boolean
  onDate: (value: number | null) => void
  onTime: (value: string) => void
}>) {
  return (
    <div className="grid grid-cols-[1fr_7rem] gap-2">
      <DateField
        label={label}
        value={date}
        locale={locale}
        placeholder={label}
        clearLabel={copy.clearDate}
        disabled={pending}
        onChange={onDate}
      />
      <label className="grid gap-1 text-xs text-muted-foreground">
        <span>{copy.time}</span>
        <Input
          type="time"
          value={time}
          disabled={pending}
          onChange={(event) => {
            onTime(event.target.value)
          }}
        />
      </label>
    </div>
  )
}
