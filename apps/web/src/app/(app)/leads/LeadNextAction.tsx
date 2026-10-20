'use client'

import { DateField } from '@ops/ui/composites/DateField'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { updateLead } from '../../../server/crm/leads/actions'
import { catalogFor } from '../../../i18n/locale'
import { LEAD_FOLLOW_UPS_COPY } from '../../../i18n/lead-follow-ups-copy'
import { useLocale } from '../../../i18n/locale-context'

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
  labels: providedLabels,
}: Readonly<{
  leadId: string
  expectedUpdatedAt: number
  value: number | null
  disabled: boolean
  labels?: Readonly<{ label: string; placeholder: string; clear: string; overdue: string; locale: string }>
}>) {
  const locale = useLocale()
  const copy = catalogFor(LEAD_FOLLOW_UPS_COPY, locale)
  const labels = providedLabels ?? {
    label: copy.nextAction,
    placeholder: copy.setNextAction,
    clear: copy.clear,
    overdue: copy.overdue,
    locale,
  }
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
        label={labels.label}
        value={value}
        locale={labels.locale}
        placeholder={labels.placeholder}
        clearLabel={labels.clear}
        disabled={disabled}
        onChange={(next) => {
          void change(next)
        }}
      />
      {isOverdue(value, now) ? (
        <span role="status" className="text-xs font-medium text-destructive">
          {labels.overdue}
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
