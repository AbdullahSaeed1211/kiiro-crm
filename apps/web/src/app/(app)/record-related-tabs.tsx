'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState, type ChangeEvent } from 'react'
import type { RecordAttachment, RelatedTask } from '../../server/crm/directory/types'
import { formatDate } from '../../i18n/format'
import { catalogFor } from '../../i18n/locale'
import { useLocale } from '../../i18n/locale-context'
import { RECORD_COPY } from '../../i18n/record-copy'
import { describeClientError } from './client-errors'
import { readApi } from './api-client'

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
  const locale = useLocale()
  const copy = catalogFor(RECORD_COPY, locale)
  const createHref = `/tasks/new?${new URLSearchParams({ relatedType: recordType, relatedId: recordId }).toString()}`
  return (
    <section className="rounded-xl border bg-card p-4" aria-labelledby="record-tasks-heading">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="record-tasks-heading" className="font-medium">
            {copy.tabTasks}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{copy.linkedWork}</p>
        </div>
        <Link
          className="text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href={createHref}
        >
          {copy.newTask}
        </Link>
      </div>
      {tasks.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{copy.noTasksYet}</p>
      ) : (
        <ul className="mt-4 divide-y rounded-lg border">
          {tasks.map((task) => (
            <li className="flex flex-wrap items-center justify-between gap-3 p-3" key={task.id}>
              <Link
                className="min-w-0 flex-1 truncate text-sm font-medium hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href={`/tasks/${task.id}`}
                data-task-link-id={task.id}
              >
                {task.title}
              </Link>
              <span className="shrink-0 text-xs text-muted-foreground">
                {task.completedAt === null ? task.priority : copy.complete}
                {task.dueAt === null
                  ? ''
                  : ` · ${copy.dueOn.replace('{date}', formatDate(task.dueAt, locale, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }))}`}
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
  const copy = catalogFor(RECORD_COPY, useLocale())
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string>()
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
      const result = await readApi(response, copy.uploadFailed)
      if (!result.ok) setMessage(result.message)
      else {
        setMessage(copy.fileUploaded)
        router.refresh()
      }
    } catch (error) {
      setMessage(describeClientError(error, { context: 'file upload', fallback: copy.serverUnreachable }))
    } finally {
      setPending(false)
      if (inputRef.current !== null) inputRef.current.value = ''
    }
  }
  return (
    <section className="rounded-xl border bg-card p-4" aria-labelledby="record-files-heading">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="record-files-heading" className="font-medium">
            {copy.tabFiles}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{copy.privateFiles}</p>
        </div>
        <label className="inline-flex h-9 cursor-pointer items-center rounded-md border px-3 text-xs font-medium hover:bg-muted focus-within:outline-none focus-within:ring-2 focus-within:ring-ring">
          <span>{pending ? copy.uploading : copy.uploadFile}</span>
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            onChange={(event) => void upload(event)}
            disabled={pending}
          />
        </label>
      </div>
      {message === undefined ? null : (
        <p className="mt-3 text-sm text-muted-foreground" role="status" aria-live="polite">
          {message}
        </p>
      )}
      {attachments.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{copy.noFilesYet}</p>
      ) : (
        <ul className="mt-4 divide-y rounded-lg border">
          {attachments.map((attachment) => (
            <li className="flex flex-wrap items-center justify-between gap-3 p-3" key={attachment.id}>
              <a
                className="min-w-0 flex-1 truncate text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href={`/api/v1/files/${attachment.id}`}
              >
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
