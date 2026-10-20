'use client'

import type { CallLogRecord } from '@ops/module-crm'
import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { useState, useTransition } from 'react'
import { catalogFor } from '../../i18n/locale'
import { CALL_LOG_COPY, type CallLogCopy } from '../../i18n/call-log-copy'
import { useLocale } from '../../i18n/locale-context'
import { recordCall } from '../../server/actions/crm/calls'

type CallWithName = CallLogRecord & { readonly callerName: string }
const OUTCOMES = ['answered', 'no_answer', 'voicemail', 'follow_up'] as const
type CallOutcome = (typeof OUTCOMES)[number]

function OutcomeSelect({
  value,
  copy,
  onChange,
}: Readonly<{
  value: CallOutcome
  copy: CallLogCopy
  onChange: (value: CallOutcome) => void
}>) {
  const labels: Record<CallOutcome, string> = {
    answered: copy.answered,
    no_answer: copy.noAnswer,
    voicemail: copy.voicemail,
    follow_up: copy.followUp,
  }
  return (
    <label className="grid gap-1.5 text-sm">
      <span>{copy.outcome}</span>
      <select
        className="h-9 rounded-md border bg-background px-3"
        value={value}
        onChange={(event) => {
          onChange(event.target.value as CallOutcome)
        }}
      >
        {OUTCOMES.map((item) => (
          <option key={item} value={item}>
            {labels[item]}
          </option>
        ))}
      </select>
    </label>
  )
}

function callOutcomeLabel(outcome: CallOutcome, copy: CallLogCopy): string {
  if (outcome === 'no_answer') return copy.noAnswer
  if (outcome === 'follow_up') return copy.followUp
  return copy[outcome]
}

function CallHistory({
  calls,
  locale,
  copy,
}: Readonly<{
  calls: readonly CallWithName[]
  locale: string
  copy: CallLogCopy
}>) {
  if (calls.length === 0) return <p className="text-sm text-muted-foreground">{copy.empty}</p>
  return (
    <ol className="divide-y rounded-lg border">
      {calls.map((call) => (
        <li key={call.id} className="grid gap-1 px-4 py-3 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <span className="font-medium">{callOutcomeLabel(call.outcome, copy)}</span>
            <time className="text-xs text-muted-foreground" dateTime={new Date(call.occurredAt).toISOString()}>
              {new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(call.occurredAt)}
            </time>
          </div>
          <p className="text-xs text-muted-foreground">{call.callerName}</p>
          {call.notes ? <p className="whitespace-pre-wrap">{call.notes}</p> : null}
        </li>
      ))}
    </ol>
  )
}

/** A quick call composer and history, embedded in the lead or contact record. */
export function RecordCallLogs({
  recordType,
  recordId,
  initialCalls,
}: Readonly<{ recordType: 'lead' | 'contact'; recordId: string; initialCalls: readonly CallWithName[] }>) {
  const locale = useLocale()
  const copy = catalogFor(CALL_LOG_COPY, locale)
  const [calls, setCalls] = useState(initialCalls)
  const [outcome, setOutcome] = useState<(typeof OUTCOMES)[number]>('answered')
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  async function saveCall() {
    const result = await recordCall({ recordType, recordId, occurredAt: Date.now(), outcome, notes: notes || null })
    if (!result.ok) {
      setMessage(result.error.message || copy.error)
      return
    }
    setCalls((current) => [{ ...result.value, callerName: '' }, ...current])
    setNotes('')
    setMessage(copy.saved)
  }
  function submit() {
    startTransition(() => {
      void saveCall()
    })
  }
  return (
    <section className="grid gap-5" aria-label={copy.heading}>
      <form className="grid gap-3 rounded-lg border p-4" action={submit}>
        <h2 className="font-medium">{copy.addCall}</h2>
        <OutcomeSelect value={outcome} copy={copy} onChange={setOutcome} />
        <label className="grid gap-1.5 text-sm">
          <span>
            {copy.notes} <span className="text-muted-foreground">({copy.optional})</span>
          </span>
          <Input
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value)
            }}
            maxLength={5_000}
          />
        </label>
        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? copy.saving : copy.save}
          </Button>
          <p role="status" className="text-sm text-muted-foreground">
            {message}
          </p>
        </div>
      </form>
      <CallHistory calls={calls} locale={locale} copy={copy} />
    </section>
  )
}
