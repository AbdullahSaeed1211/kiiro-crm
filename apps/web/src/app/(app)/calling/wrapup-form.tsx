'use client'

import type { VoiceCall, VoiceOutcome } from '@ops/module-crm'
import { Button } from '@ops/ui/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ops/ui/components/ui/select'
import { Textarea } from '@ops/ui/components/ui/textarea'
import { Check } from 'lucide-react'
import { useState } from 'react'
import type { CallingCopy } from '../../../i18n/calling-copy'
import { workspaceDateTime } from './calling-time'
import { DateAndTime } from './wrapup-date-time'

const OUTCOMES: readonly VoiceOutcome[] = [
  'interested',
  'booking_arranged',
  'call_back_later',
  'no_answer',
  'voicemail',
  'not_interested',
  'wrong_number',
]

function outcomeLabel(value: VoiceOutcome, copy: CallingCopy): string {
  const labels: Record<VoiceOutcome, string> = {
    interested: copy.interested,
    booking_arranged: copy.bookingArranged,
    call_back_later: copy.callBackLater,
    no_answer: copy.noAnswer,
    voicemail: copy.voicemail,
    not_interested: copy.notInterested,
    wrong_number: copy.wrongNumber,
  }
  return labels[value]
}

export function WrapupForm({
  call,
  copy,
  locale,
  pending,
  onSave,
}: Readonly<{
  call: VoiceCall
  copy: CallingCopy
  locale: string
  pending: boolean
  onSave: (call: VoiceCall, values: Record<string, unknown>) => void
}>) {
  const [outcome, setOutcome] = useState<VoiceOutcome | ''>('')
  const [notes, setNotes] = useState('')
  const [callbackDate, setCallbackDate] = useState<number | null>(null)
  const [appointmentDate, setAppointmentDate] = useState<number | null>(null)
  const [callbackTime, setCallbackTime] = useState('10:00')
  const [appointmentTime, setAppointmentTime] = useState('10:00')
  const canSave = isWrapupValid({ outcome, callbackDate, appointmentDate })
  const save = () => {
    saveWrapup({ call, outcome, notes, callbackDate, callbackTime, appointmentDate, appointmentTime, canSave, onSave })
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Check aria-hidden className="size-4 text-emerald-600" />
        {copy.wrapup}
      </div>
      <OutcomeSelect outcome={outcome} copy={copy} onChange={setOutcome} />
      <Textarea
        aria-label={copy.notes}
        placeholder={copy.notes}
        value={notes}
        onChange={(event) => {
          setNotes(event.target.value)
        }}
      />
      <WrapupScheduleFields
        outcome={outcome}
        callbackDate={callbackDate}
        appointmentDate={appointmentDate}
        callbackTime={callbackTime}
        appointmentTime={appointmentTime}
        locale={locale}
        copy={copy}
        pending={pending}
        onCallbackDate={setCallbackDate}
        onAppointmentDate={setAppointmentDate}
        onCallbackTime={setCallbackTime}
        onAppointmentTime={setAppointmentTime}
      />
      <p className="text-xs text-muted-foreground">{copy.dateTimeNote}</p>
      <Button disabled={!canSave || pending} className="w-full" onClick={save}>
        {copy.saveWrapup}
      </Button>
    </div>
  )
}

function isWrapupValid({
  outcome,
  callbackDate,
  appointmentDate,
}: Readonly<{
  outcome: VoiceOutcome | ''
  callbackDate: number | null
  appointmentDate: number | null
}>): boolean {
  return (
    outcome !== '' &&
    (outcome !== 'call_back_later' || callbackDate !== null) &&
    (outcome !== 'booking_arranged' || appointmentDate !== null)
  )
}

function saveWrapup({
  call,
  outcome,
  notes,
  callbackDate,
  callbackTime,
  appointmentDate,
  appointmentTime,
  canSave,
  onSave,
}: Readonly<{
  call: VoiceCall
  outcome: VoiceOutcome | ''
  notes: string
  callbackDate: number | null
  callbackTime: string
  appointmentDate: number | null
  appointmentTime: string
  canSave: boolean
  onSave: (call: VoiceCall, values: Record<string, unknown>) => void
}>): void {
  if (!canSave) return
  onSave(call, {
    outcome,
    notes: notes.trim() || null,
    nextActionAt: outcome === 'call_back_later' ? workspaceDateTime(callbackDate, callbackTime) : null,
    appointmentAt: outcome === 'booking_arranged' ? workspaceDateTime(appointmentDate, appointmentTime) : null,
  })
}

function OutcomeSelect({
  outcome,
  copy,
  onChange,
}: Readonly<{
  outcome: VoiceOutcome | ''
  copy: CallingCopy
  onChange: (value: VoiceOutcome | '') => void
}>) {
  return (
    <Select
      value={outcome}
      onValueChange={(value) => {
        onChange(value ?? '')
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={copy.outcome} />
      </SelectTrigger>
      <SelectContent>
        {OUTCOMES.map((value) => (
          <SelectItem key={value} value={value}>
            {outcomeLabel(value, copy)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function WrapupScheduleFields({
  outcome,
  callbackDate,
  appointmentDate,
  callbackTime,
  appointmentTime,
  locale,
  copy,
  pending,
  onCallbackDate,
  onAppointmentDate,
  onCallbackTime,
  onAppointmentTime,
}: Readonly<{
  outcome: VoiceOutcome | ''
  callbackDate: number | null
  appointmentDate: number | null
  callbackTime: string
  appointmentTime: string
  locale: string
  copy: CallingCopy
  pending: boolean
  onCallbackDate: (date: number | null) => void
  onAppointmentDate: (date: number | null) => void
  onCallbackTime: (time: string) => void
  onAppointmentTime: (time: string) => void
}>) {
  if (outcome === 'call_back_later') {
    return (
      <DateAndTime
        label={copy.callbackDate}
        date={callbackDate}
        time={callbackTime}
        locale={locale}
        copy={copy}
        pending={pending}
        onDate={onCallbackDate}
        onTime={onCallbackTime}
      />
    )
  }
  if (outcome !== 'booking_arranged') return null
  return (
    <DateAndTime
      label={copy.bookingDate}
      date={appointmentDate}
      time={appointmentTime}
      locale={locale}
      copy={copy}
      pending={pending}
      onDate={onAppointmentDate}
      onTime={onAppointmentTime}
    />
  )
}
