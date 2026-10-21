'use client'

import { useState, useTransition, type SubmitEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { zonedMinuteToUnix } from '@ops/module-intake'
import { saveScheduleItem } from '../../../server/actions/crm/schedule-items'

type LeadOption = Readonly<{ id: string; title: string }>

function QuickScheduleFields({
  leads,
  timeZone,
  copy,
  pending,
  error,
}: Readonly<{
  leads: readonly LeadOption[]
  timeZone: string
  copy: Readonly<Record<string, string>>
  pending: boolean
  error: string | undefined
}>) {
  return (
    <>
      <label className="grid min-w-44 flex-1 gap-1 text-xs font-medium text-muted-foreground">
        {copy.record}
        <NativeSelect name="recordId" required className="w-full">
          {leads.length === 0 ? <option value="">{copy.chooseLead}</option> : null}
          {leads.map((lead) => (
            <option key={lead.id} value={lead.id}>
              {lead.title}
            </option>
          ))}
        </NativeSelect>
      </label>
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
        {copy.kind}
        <NativeSelect name="kind" defaultValue="callback">
          <option value="callback">{copy.callback}</option>
          <option value="appointment">{copy.appointment}</option>
        </NativeSelect>
      </label>
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
        {copy.when} · {copy.timeZone} ({timeZone})
        <Input name="when" type="datetime-local" required disabled={pending} className="w-auto" />
      </label>
      <Button type="submit" size="sm" disabled={pending || leads.length === 0}>
        {pending ? copy.saving : copy.create}
      </Button>
      {error === undefined ? null : (
        <p role="alert" className="w-full text-sm text-destructive">
          {error || copy.failed}
        </p>
      )}
    </>
  )
}

/** Capture a callback or meeting in one short form; assignment defaults to the authorized actor. */
export function QuickSchedule({
  leads,
  timeZone,
  copy,
}: Readonly<{
  leads: readonly LeadOption[]
  timeZone: string
  copy: Readonly<Record<string, string>>
}>) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()
  const router = useRouter()
  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const recordId = form.get('recordId')
    const kind = form.get('kind')
    const localWhen = form.get('when')
    if (
      typeof recordId !== 'string' ||
      typeof localWhen !== 'string' ||
      (kind !== 'callback' && kind !== 'appointment')
    )
      return
    const startsAt = zonedMinuteToUnix(localWhen, timeZone)
    const formElement = event.currentTarget
    if (startsAt === undefined || !Number.isSafeInteger(startsAt) || startsAt < 0) {
      setError(copy.failed)
      return
    }
    setError(undefined)
    startTransition(async () => {
      try {
        const result = await saveScheduleItem({
          kind,
          recordType: 'lead',
          recordId,
          startsAt,
        })
        if (!result.ok) {
          setError(result.error.message || copy.failed)
          return
        }
        formElement.reset()
        router.refresh()
      } catch {
        setError(copy.failed)
      }
    })
  }
  return (
    <form className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3" onSubmit={submit}>
      <QuickScheduleFields leads={leads} timeZone={timeZone} copy={copy} pending={pending} error={error} />
    </form>
  )
}
