'use client'

import { useState } from 'react'
import { zonedMinuteToUnix } from '@ops/module-intake'
import { DateField } from '@ops/ui/composites/DateField'
import { Input } from '@ops/ui/components/ui/input'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { INTAKE_BOOKING_COPY } from '../../../../i18n/intake-booking-copy'
import type { Locale } from '../../../../i18n/locale'

/** Dates and times are presentation only; the named answer submitted to the server is one UTC Unix millisecond. */
export function BookingInstant({
  name,
  timeZone,
  locale,
}: Readonly<{ name: string; timeZone: string; locale: Locale }>) {
  const [day, setDay] = useState<number | null>(null)
  const [time, setTime] = useState('')
  const [zone, setZone] = useState(timeZone)
  const copy = INTAKE_BOOKING_COPY[locale]
  const local = day === null || time === '' ? '' : `${new Date(day).toISOString().slice(0, 10)}T${time}`
  const instant = zonedMinuteToUnix(local, zone)
  const zones = [
    ...new Set([
      timeZone,
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'Europe/London',
      'Asia/Kolkata',
      'UTC',
    ]),
  ]
  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <span className="text-sm">{copy.date}</span>
          <DateField
            label={copy.date}
            value={day}
            locale={locale}
            placeholder={copy.choose}
            clearLabel={copy.clear}
            disabled={false}
            onChange={setDay}
          />
        </div>
        <label className="grid gap-1.5 text-sm">
          {copy.time}
          <Input
            type="time"
            value={time}
            onInput={(event) => {
              setTime(event.currentTarget.value)
            }}
          />
        </label>
      </div>
      <label className="grid gap-1.5 text-sm">
        {copy.zone}
        <NativeSelect
          value={zone}
          onChange={(event) => {
            setZone(event.target.value)
          }}
        >
          {zones.map((value) => (
            <option key={value} value={value}>
              {value.replaceAll('_', ' ')}
            </option>
          ))}
        </NativeSelect>
      </label>
      <input type="hidden" name={name} value={instant ?? ''} />
      {local !== '' && instant === undefined ? (
        <p role="alert" className="text-xs text-destructive">
          {copy.invalid}
        </p>
      ) : null}
    </div>
  )
}
