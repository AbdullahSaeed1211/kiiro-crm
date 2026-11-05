'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { catalogFor } from '../../../../i18n/locale'
import { useLocale } from '../../../../i18n/locale-context'
import { SALES_SETTINGS_COPY } from '../../../../i18n/sales-settings-copy'
import { useState } from 'react'
import { saveResponseTarget } from '../../../../server/actions/settings/sales'
import { useSave } from './use-save'

/** How long a new lead may wait for a first response before the lists and the lead page flag it. */
export function ResponseTargetForm({ hours }: Readonly<{ hours: number }>) {
  const copy = catalogFor(SALES_SETTINGS_COPY, useLocale())
  const [value, setValue] = useState(String(hours))
  const { save, message, pending } = useSave(saveResponseTarget)
  return (
    <div className="grid gap-2 text-sm">
      <h2 className="font-medium">{copy.response.title}</h2>
      <p className="text-muted-foreground">{copy.response.help}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label={copy.response.hoursAria}
          className="w-24"
          type="number"
          min={0}
          max={720}
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
          }}
        />
        <span>{copy.response.hours}</span>
        <Button
          size="sm"
          disabled={pending}
          onClick={() => {
            save({ hours: Number(value) })
          }}
        >
          {copy.save}
        </Button>
        {message === null ? null : <span role="status">{message}</span>}
      </div>
    </div>
  )
}
