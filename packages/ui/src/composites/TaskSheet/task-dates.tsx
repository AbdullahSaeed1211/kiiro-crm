'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Calendar } from '@ops/ui/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@ops/ui/components/ui/popover'
import { CalendarDays } from 'lucide-react'

/** A calendar day chosen in the picker, stored as UTC midnight like the timeline and calendar views. */
function toUtcDay(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
}

function fromUtcDay(value: number): Date {
  const date = new Date(value)
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

/** Date property control: shows the day in the tenant locale and saves the picked day or a cleared value. */
export function TaskDateField({
  label,
  value,
  locale,
  placeholder,
  clearLabel,
  disabled,
  onChange,
}: Readonly<{
  label: string
  value: number | null
  locale: string
  placeholder: string
  clearLabel: string
  disabled: boolean
  onChange: (value: number | null) => void
}>) {
  const text =
    value === null
      ? placeholder
      : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(value)
  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="outline" size="sm" className="w-full justify-start font-normal" />}
        disabled={disabled}
        aria-label={label}
      >
        <CalendarDays aria-hidden className="mr-2 size-4" />
        <span className={value === null ? 'text-muted-foreground' : undefined}>{text}</span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value === null ? undefined : fromUtcDay(value)}
          onSelect={(date) => {
            onChange(date === undefined ? null : toUtcDay(date))
          }}
        />
        {value === null ? null : (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange(null)
              }}
            >
              {clearLabel}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
