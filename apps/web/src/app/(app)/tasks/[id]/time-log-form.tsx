'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { deleteTime, logTime } from '../../../../server/actions/work/tasks/timeEntries'

interface Row {
  readonly id: string
  readonly label: string
  readonly note: string
  readonly canDelete: boolean
}

function EntryList({
  entries,
  pending,
  onRemove,
}: Readonly<{ entries: readonly Row[]; pending: boolean; onRemove: (entryId: string) => void }>) {
  if (entries.length === 0) return null
  return (
    <ul className="divide-y">
      {entries.map((entry) => (
        <li key={entry.id} className="flex items-start justify-between gap-2 py-1.5">
          <span>
            {entry.label}
            {entry.note === '' ? null : <span className="block text-xs text-muted-foreground">{entry.note}</span>}
          </span>
          {entry.canDelete ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              aria-label={`Delete ${entry.label}`}
              onClick={() => {
                onRemove(entry.id)
              }}
            >
              Delete
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

/** The list of entries and the form that adds one. */
export function TimeLogForm({
  taskId,
  today,
  entries,
}: Readonly<{ taskId: string; today: string; entries: readonly Row[] }>) {
  const router = useRouter()
  const [duration, setDuration] = useState('')
  const [day, setDay] = useState(today)
  const [note, setNote] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const add = () => {
    startTransition(async () => {
      const result = await logTime({ taskId, duration, day, note })
      if (result.ok) {
        setDuration('')
        setNote('')
        setMessage(null)
        router.refresh()
      } else setMessage(result.error.message)
    })
  }
  const remove = (entryId: string) => {
    startTransition(async () => {
      const result = await deleteTime({ entryId, taskId })
      if (result.ok) router.refresh()
      else setMessage(result.error.message)
    })
  }
  return (
    <div className="grid gap-2">
      <EntryList entries={entries} pending={pending} onRemove={remove} />
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Time spent"
          placeholder="1h 30m"
          className="w-24"
          value={duration}
          onChange={(event) => {
            setDuration(event.target.value)
          }}
        />
        <Input
          aria-label="Day worked"
          type="date"
          className="w-40"
          value={day}
          max={today}
          onChange={(event) => {
            setDay(event.target.value)
          }}
        />
        <Input
          aria-label="Time note"
          placeholder="What you did (optional)"
          className="min-w-40 flex-1"
          value={note}
          onChange={(event) => {
            setNote(event.target.value)
          }}
        />
        <Button size="sm" variant="outline" disabled={pending || duration.trim() === ''} onClick={add}>
          Log time
        </Button>
      </div>
      {message === null ? null : <p role="status">{message}</p>}
    </div>
  )
}
