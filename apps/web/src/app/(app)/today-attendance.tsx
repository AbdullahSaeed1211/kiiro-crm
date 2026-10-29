'use client'

import { Clock3 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { AttendanceRecord } from '@ops/module-work'
import { Button } from '@ops/ui/components/ui/button'
import { ATTENDANCE_COPY, type AttendanceCopy } from '@/i18n/attendance-copy'
import type { Locale } from '@/i18n/locale'
import type { ActionResult } from '@/server/action-result'

function timeLabel(value: number, { locale, timeZone }: Readonly<{ locale: Locale; timeZone: string }>): string {
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone }).format(value)
}

function durationLabel(milliseconds: number, locale: Locale): string {
  const minutes = Math.max(0, Math.floor(milliseconds / 60_000))
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return locale === 'es'
    ? `${hours.toString()} h ${remainder.toString()} min`
    : `${hours.toString()}h ${remainder.toString()}m`
}

async function send(open: AttendanceRecord | null): Promise<ActionResult<AttendanceRecord>> {
  const response = await fetch(open === null ? '/api/v1/attendance' : '/api/v1/attendance/check-out', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(open === null ? {} : { sessionId: open.id }),
  })
  return response.json()
}

function useAttendanceSubmit({
  open,
  copy,
  setOpen,
  setLatest,
  setPending,
  setError,
}: Readonly<{
  open: AttendanceRecord | null
  copy: AttendanceCopy
  setOpen: (value: AttendanceRecord | null) => void
  setLatest: (value: AttendanceRecord) => void
  setPending: (value: boolean) => void
  setError: (value: string) => void
}>) {
  const router = useRouter()
  const saving = useRef(false)
  return async function submit(): Promise<void> {
    if (saving.current) return
    saving.current = true
    setPending(true)
    setError('')
    try {
      const result = await send(open)
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      const checkedOut = result.data.reportedCheckOutAt !== null
      setOpen(checkedOut ? null : result.data)
      if (checkedOut) setLatest(result.data)
      router.refresh()
    } catch {
      setError(copy.error)
    } finally {
      saving.current = false
      setPending(false)
    }
  }
}

function attendanceButtonLabel({
  pending,
  open,
  copy,
}: Readonly<{ pending: boolean; open: AttendanceRecord | null; copy: AttendanceCopy }>): string {
  if (pending) return copy.saving
  if (open === null) return copy.dashboardMarkNow
  return copy.checkOut
}

function attendanceTimeLine({
  copy,
  checkedOut,
  time,
  duration,
}: Readonly<{
  copy: AttendanceCopy
  checkedOut: boolean
  time: string
  duration: string
}>): string {
  let line = copy.dashboardCheckedIn.replace('{time}', time)
  if (checkedOut) line = copy.dashboardCheckedOut.replace('{time}', time)
  if (duration) line += ` · ${copy.dashboardDuration.replace('{duration}', duration)}`
  return line
}

function AttendanceStatus({
  open,
  latest,
  locale,
  timeZone,
}: Readonly<{ open: AttendanceRecord | null; latest: AttendanceRecord | null; locale: Locale; timeZone: string }>) {
  const copy = ATTENDANCE_COPY[locale]
  let title: string = copy.title
  let time = ''
  let checkedOut = false
  let duration = ''

  if (open !== null) {
    title = copy.working
    time = timeLabel(open.reportedCheckInAt, { locale, timeZone })
  } else if (latest !== null) {
    checkedOut = true
    title = copy.away
    const checkOut = latest.reportedCheckOutAt ?? latest.checkOutSubmittedAt ?? 0
    time = timeLabel(checkOut, { locale, timeZone })
    if (latest.reportedCheckOutAt !== null) {
      duration = durationLabel(latest.reportedCheckOutAt - latest.reportedCheckInAt, locale)
    }
  }

  return (
    <div aria-live="polite" className="flex min-w-0 items-center gap-2">
      <Clock3 aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 text-sm">
        <p className="font-medium">{title}</p>
        {time ? (
          <p className="truncate text-xs text-muted-foreground">
            {attendanceTimeLine({ copy, checkedOut, time, duration })}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export function TodayAttendance({
  open: initialOpen,
  latest: initialLatest,
  locale,
  timeZone,
}: Readonly<{
  open: AttendanceRecord | null
  latest: AttendanceRecord | null
  locale: Locale
  timeZone: string
}>) {
  const copy = ATTENDANCE_COPY[locale]
  const [open, setOpen] = useState(initialOpen)
  const [latest, setLatest] = useState(initialLatest)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const syncedProps = useRef({ open: initialOpen, latest: initialLatest })
  const submit = useAttendanceSubmit({ open, copy, setOpen, setLatest, setPending, setError })

  useEffect(() => {
    if (pending || (syncedProps.current.open === initialOpen && syncedProps.current.latest === initialLatest)) {
      return
    }
    syncedProps.current = { open: initialOpen, latest: initialLatest }
    setOpen(initialOpen)
    setLatest(initialLatest)
  }, [initialLatest, initialOpen, pending])

  return (
    <section
      aria-label={copy.title}
      className="flex min-h-[4.5rem] min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border bg-card px-3 py-2"
    >
      <AttendanceStatus open={open} latest={latest} locale={locale} timeZone={timeZone} />
      <Button type="button" size="sm" className="shrink-0" disabled={pending} onClick={() => void submit()}>
        {attendanceButtonLabel({ pending, open, copy })}
      </Button>
      {error ? (
        <p role="alert" className="w-full text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  )
}
