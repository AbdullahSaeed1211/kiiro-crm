'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState, type ChangeEvent } from 'react'
import type { RecordAttachment, RelatedTask } from '../../server/crm/directory/types'

const DATE_FORMAT = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

function bytes(value: number): string {
  if (value < 1024) return `${String(value)} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

export function RelatedTasksTab({
  tasks,
  recordType,
  recordId,
}: Readonly<{ tasks: readonly RelatedTask[]; recordType: string; recordId: string }>) {
  const createHref = `/tasks?${new URLSearchParams({ relatedType: recordType, relatedId: recordId }).toString()}`
  return (
    <section className="rounded-xl border bg-card p-4" aria-labelledby="record-tasks-heading">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="record-tasks-heading" className="font-medium">Tasks</h2>
          <p className="mt-1 text-sm text-muted-foreground">Linked work.</p>
        </div>
        <Link className="text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={createHref}>
          New task
        </Link>
      </div>
      {tasks.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No tasks yet.</p>
      ) : (
        <ul className="mt-4 divide-y rounded-lg border">
          {tasks.map((task) => (
            <li className="flex flex-wrap items-center justify-between gap-3 p-3" key={task.id}>
              <Link className="min-w-0 flex-1 truncate text-sm font-medium hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={`/tasks/${task.id}`}>
                {task.title}
              </Link>
              <span className="shrink-0 text-xs text-muted-foreground">
                {task.completedAt === null ? task.priority : 'Complete'}
                {task.dueAt === null ? '' : ` · due ${DATE_FORMAT.format(task.dueAt)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function RecordFilesTab({
  attachments,
  recordType,
  recordId,
}: Readonly<{ attachments: readonly RecordAttachment[]; recordType: string; recordId: string }>) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string>()
  // eslint-disable-next-line complexity -- upload feedback handles the complete browser request lifecycle.
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file === undefined) return
    setPending(true)
    setMessage(undefined)
    const form = new FormData()
    form.set('recordType', recordType)
    form.set('recordId', recordId)
    form.set('file', file)
    try {
      const response = await fetch('/api/v1/files', { method: 'POST', body: form })
      const payload: unknown = await response.json()
      const data = typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {}
      if (!response.ok) setMessage(typeof data.error === 'string' ? data.error : 'Unable to upload file.')
      else {
        setMessage('File uploaded.')
        router.refresh()
      }
    } catch {
      setMessage('Unable to reach the server. Try again.')
    } finally {
      setPending(false)
      if (inputRef.current !== null) inputRef.current.value = ''
    }
  }
  return (
    <section className="rounded-xl border bg-card p-4" aria-labelledby="record-files-heading">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="record-files-heading" className="font-medium">Files</h2>
          <p className="mt-1 text-sm text-muted-foreground">Private files.</p>
        </div>
        <label className="inline-flex h-9 cursor-pointer items-center rounded-md border px-3 text-xs font-medium hover:bg-muted focus-within:outline-none focus-within:ring-2 focus-within:ring-ring">
          <span>{pending ? 'Uploading…' : 'Upload file'}</span>
          <input ref={inputRef} className="sr-only" type="file" onChange={(event) => void upload(event)} disabled={pending} />
        </label>
      </div>
      {message === undefined ? null : <p className="mt-3 text-sm text-muted-foreground" role="status" aria-live="polite">{message}</p>}
      {attachments.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No files yet.</p>
      ) : (
        <ul className="mt-4 divide-y rounded-lg border">
          {attachments.map((attachment) => (
            <li className="flex flex-wrap items-center justify-between gap-3 p-3" key={attachment.id}>
              <a className="min-w-0 flex-1 truncate text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={`/api/v1/files/${attachment.id}`}>
                {attachment.fileName}
              </a>
              <span className="shrink-0 text-xs text-muted-foreground">{bytes(attachment.sizeBytes)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
