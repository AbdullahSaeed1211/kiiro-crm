'use client'

import { Button } from '@ops/ui/components/ui/button'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { useState } from 'react'
import type { ReportRange } from '../../../server/queries/reports'
import type { REPORT_COPY } from '../../../i18n/config'

type ReportCopy = (typeof REPORT_COPY)[keyof typeof REPORT_COPY]

export function ReportRangeControls({
  range,
  copy,
  formattedRange,
}: Readonly<{
  range: ReportRange
  copy: ReportCopy
  formattedRange: string
}>) {
  const [selectedRange, setSelectedRange] = useState(range.key)
  const options = [
    ['7d', copy.last7],
    ['30d', copy.last30],
    ['90d', copy.last90],
    ['ytd', copy.ytd],
    ['custom', copy.custom],
  ] as const
  return (
    <form method="get" className="ops-surface-card flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3">
      <label className="grid gap-1 text-xs font-medium">
        <span>{copy.range}</span>
        <NativeSelect
          name="range"
          value={selectedRange}
          onChange={(event) => {
            setSelectedRange(event.target.value as ReportRange['key'])
          }}
          className="h-9 min-w-40"
        >
          {options.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </label>
      <label className="grid gap-1 text-xs font-medium">
        <span>{copy.from}</span>
        <input
          name="from"
          type="date"
          defaultValue={range.fromDate}
          onChange={() => {
            setSelectedRange('custom')
          }}
          className="h-9 rounded-md border bg-background px-2 text-sm"
        />
      </label>
      <label className="grid gap-1 text-xs font-medium">
        <span>{copy.to}</span>
        <input
          name="to"
          type="date"
          defaultValue={range.toDate}
          onChange={() => {
            setSelectedRange('custom')
          }}
          className="h-9 rounded-md border bg-background px-2 text-sm"
        />
      </label>
      <Button size="lg" type="submit">
        {copy.apply}
      </Button>
      <output className="text-xs text-muted-foreground" aria-live="polite">
        {formattedRange}
      </output>
    </form>
  )
}
