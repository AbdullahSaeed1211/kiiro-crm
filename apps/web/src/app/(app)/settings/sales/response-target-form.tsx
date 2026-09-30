'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { useState } from 'react'
import { saveResponseTarget } from '../../../../server/actions/settings/sales'
import { useSave } from './use-save'

/** How long a new lead may wait for a first response before the lists and the lead page flag it. */
export function ResponseTargetForm({ hours }: Readonly<{ hours: number }>) {
  const [value, setValue] = useState(String(hours))
  const { save, message, pending } = useSave(saveResponseTarget)
  return (
    <div className="grid gap-2 text-sm">
      <h2 className="font-medium">First response target</h2>
      <p className="text-muted-foreground">
        A new lead that is still in the first pipeline stage after this many hours is marked "Response overdue". Use 0
        to turn the marker off.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Hours"
          className="w-24"
          type="number"
          min={0}
          max={720}
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
          }}
        />
        <span>hours</span>
        <Button
          size="sm"
          disabled={pending}
          onClick={() => {
            save({ hours: Number(value) })
          }}
        >
          Save
        </Button>
        {message === null ? null : <span role="status">{message}</span>}
      </div>
    </div>
  )
}
