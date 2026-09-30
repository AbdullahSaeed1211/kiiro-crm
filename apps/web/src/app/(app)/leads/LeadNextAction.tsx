'use client'

import { DateField } from '@ops/ui/composites/DateField'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { updateLead } from '../../../server/crm/leads/actions'

const DAY_MS = 24 * 60 * 60 * 1000

/** A follow-up is overdue once its day has fully passed (days are stored as UTC midnight). */
function isOverdue(day: number | null, now: number): boolean {
  return day !== null && day + DAY_MS <= now
}

/** The day the next follow-up on a lead is due, editable in place, with a marker once it is overdue. */
export function LeadNextAction({
  leadId,
  expectedUpdatedAt,
  value,
  disabled,
}: Readonly<{ leadId: string; expectedUpdatedAt: number; value: number | null; disabled: boolean }>) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [now] = useState(() => Date.now())
  const change = async (next: number | null) => {
    setError(null)
    const result = await updateLead({ id: leadId, expectedUpdatedAt, patch: { nextActionAt: next } })
    if (!result.ok) setError(result.error.message)
    router.refresh()
  }
  return (
    <div className="grid gap-1.5">
      <DateField
        label="Next action"
        value={value}
        locale="en"
        placeholder="Set next action date"
        clearLabel="Clear"
        disabled={disabled}
        onChange={(next) => {
          void change(next)
        }}
      />
      {isOverdue(value, now) ? (
        <span role="status" className="text-xs font-medium text-destructive">
          Overdue
        </span>
      ) : null}
      {error === null ? null : (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </div>
  )
}
