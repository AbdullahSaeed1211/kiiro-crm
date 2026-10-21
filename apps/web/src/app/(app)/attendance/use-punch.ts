'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AttendanceRecord } from '@ops/module-work'
import type { ActionResult } from '@/server/action-result'
import type { AttendanceCopy } from '@/i18n/attendance-copy'

function reportedTimestamp(day: number | null, time: string): number | null {
  if (day === null || !/^\d{2}:\d{2}$/u.test(time)) return null
  const date = new Date(day),
    [hours, minutes] = time.split(':').map(Number)
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hours, minutes).getTime()
}

async function sendPunch(open: AttendanceRecord | null, body: object): Promise<ActionResult<AttendanceRecord>> {
  const url = open === null ? '/api/v1/attendance' : '/api/v1/attendance/check-out'
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return response.json()
}

function usePunchSubmission(open: AttendanceRecord | null, copy: AttendanceCopy, onSaved: () => void) {
  const router = useRouter()
  const [pending, setPending] = useState(false),
    [error, setError] = useState('')
  async function save(body: object) {
    setPending(true)
    setError('')
    try {
      const result = await sendPunch(open, body)
      if (!result.ok) {
        setError(result.error.message)
        if (result.error.code === 'CONFLICT') router.refresh()
        return
      }
      onSaved()
      router.refresh()
    } catch {
      setError(copy.error)
    } finally {
      setPending(false)
    }
  }
  return { pending, error, setError, save }
}

export function usePunch(open: AttendanceRecord | null, copy: AttendanceCopy) {
  const [earlier, setEarlier] = useState(false),
    [day, setDay] = useState<number | null>(null)
  const [time, setTime] = useState(''),
    [note, setNote] = useState('')
  const { pending, error, setError, save } = usePunchSubmission(open, copy, () => {
    setEarlier(false)
    setNote('')
  })
  function submit() {
    const reportedAt = earlier ? reportedTimestamp(day, time) : null
    if (earlier && (reportedAt === null || !Number.isFinite(reportedAt))) {
      setError(copy.invalid)
      return
    }
    void save({
      ...(open === null ? {} : { sessionId: open.id }),
      ...(reportedAt === null ? {} : { reportedAt }),
      note,
    })
  }
  return {
    earlier,
    setEarlier,
    day,
    setDay,
    time,
    setTime,
    note,
    setNote,
    pending,
    error,
    submit,
    label: punchLabel({ open, earlier, pending }, copy),
  }
}

function punchLabel(
  input: { open: AttendanceRecord | null; earlier: boolean; pending: boolean },
  copy: AttendanceCopy,
) {
  if (input.pending) return copy.saving
  if (input.earlier) return copy.save
  return input.open === null ? copy.checkIn : copy.checkOut
}
