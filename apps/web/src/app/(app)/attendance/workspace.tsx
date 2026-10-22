'use client'

import { useSyncExternalStore } from 'react'
import type { AttendanceRecord } from '@ops/module-work'
import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { DateField } from '@ops/ui/composites/DateField'
import { useLocale } from '@/i18n/locale-context'
import { ATTENDANCE_COPY, type AttendanceCopy } from '@/i18n/attendance-copy'
import { usePunch } from './use-punch'
import { AttendanceHistory, attendanceTime } from './history'

const subscribeZone = () => () => undefined
const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone
const serverZone = () => 'UTC'

function EarlierTimeFields({
  punch,
  copy,
  locale,
  zone,
}: Readonly<{ punch: ReturnType<typeof usePunch>; copy: AttendanceCopy; locale: string; zone: string }>) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <DateField
        label={copy.day}
        value={punch.day}
        locale={locale}
        placeholder={copy.choose}
        clearLabel={copy.clear}
        disabled={punch.pending}
        onChange={punch.setDay}
      />
      <label className="grid gap-1 text-sm">
        {copy.time}
        <Input
          type="time"
          value={punch.time}
          disabled={punch.pending}
          onChange={(event) => {
            punch.setTime(event.target.value)
          }}
        />
      </label>
      <p className="text-xs text-muted-foreground sm:col-span-2">
        {copy.zone} {zone}
      </p>
      <label className="grid gap-1 text-sm sm:col-span-2">
        {copy.reason}
        <Input
          value={punch.note}
          maxLength={500}
          disabled={punch.pending}
          onChange={(event) => {
            punch.setNote(event.target.value)
          }}
          placeholder={copy.reasonHint}
        />
      </label>
    </div>
  )
}

function OptionalNote({ punch, copy }: Readonly<{ punch: ReturnType<typeof usePunch>; copy: AttendanceCopy }>) {
  return (
    <div className="grid gap-2">
      <label className="flex min-h-8 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={punch.noteVisible}
          disabled={punch.pending}
          onChange={(event) => {
            punch.setNoteVisible(event.target.checked)
          }}
        />
        {copy.addNote}
      </label>
      {punch.noteVisible ? (
        <label className="grid gap-1 text-sm">
          {copy.note}
          <Input
            value={punch.note}
            maxLength={500}
            disabled={punch.pending}
            onChange={(event) => {
              punch.setNote(event.target.value)
            }}
            placeholder={copy.noteHint}
          />
        </label>
      ) : null}
    </div>
  )
}

function AttendanceOptions({
  punch,
  copy,
  locale,
  zone,
}: Readonly<{ punch: ReturnType<typeof usePunch>; copy: AttendanceCopy; locale: string; zone: string }>) {
  return (
    <div className="grid gap-3 border-t pt-3">
      <label className="flex min-h-8 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={punch.earlier}
          disabled={punch.pending}
          onChange={(event) => {
            punch.setEarlier(event.target.checked)
          }}
        />
        {copy.earlier}
      </label>
      {punch.earlier ? (
        <EarlierTimeFields punch={punch} copy={copy} locale={locale} zone={zone} />
      ) : (
        <OptionalNote punch={punch} copy={copy} />
      )}
    </div>
  )
}

function AttendancePunch({
  open,
  copy,
  zone,
}: Readonly<{ open: AttendanceRecord | null; copy: AttendanceCopy; zone: string }>) {
  const locale = useLocale(),
    punch = usePunch(open, copy)
  return (
    <section className="grid max-w-xl gap-4 rounded-xl border bg-card p-5" aria-label={copy.mine}>
      <div>
        <h2 className="font-medium">{open === null ? copy.away : copy.working}</h2>
        {open === null ? null : (
          <p className="mt-1 text-sm text-muted-foreground">
            {attendanceTime(open.reportedCheckInAt, { locale, zone })}
          </p>
        )}
      </div>
      <Button disabled={punch.pending} onClick={punch.submit} className="justify-self-start">
        {punch.label}
      </Button>
      <AttendanceOptions punch={punch} copy={copy} locale={locale} zone={zone} />
      {punch.error ? (
        <p role="alert" className="text-sm text-destructive">
          {punch.error}
        </p>
      ) : null}
    </section>
  )
}

export function AttendanceWorkspace(
  props: Readonly<{
    records: readonly AttendanceRecord[]
    open: AttendanceRecord | null
    names: Readonly<Record<string, string>>
    team: boolean
    admin: boolean
  }>,
) {
  const locale = useLocale(),
    copy = ATTENDANCE_COPY[locale]
  const zone = useSyncExternalStore(subscribeZone, browserZone, serverZone)
  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{copy.description}</p>
      </header>
      <AttendancePunch open={props.open} copy={copy} zone={zone} />
      <p className="text-xs text-muted-foreground">
        {copy.zone} {zone}
      </p>
      <AttendanceHistory {...props} copy={copy} locale={locale} zone={zone} />
    </div>
  )
}
