'use client'

import { createTask } from '../../../server/actions/work/tasks/createTask'
import { catalogFor } from '../../../i18n/locale'
import { useLocale } from '../../../i18n/locale-context'
import { TASK_QUICK_ADD_COPY } from '../../../i18n/task-quick-add-copy'
import { useRouter } from 'next/navigation'
import { useState, type SyntheticEvent } from 'react'

export function TaskCreateForm({
  relatedType,
  relatedId,
  contextLabel,
  initialTitle,
}: Readonly<{
  relatedType?: string
  relatedId?: string
  contextLabel?: string
  initialTitle?: string
}>) {
  const router = useRouter()
  const copy = catalogFor(TASK_QUICK_ADD_COPY, useLocale())
  const [pending, setPending] = useState(false)
  const [title, setTitle] = useState(initialTitle ?? '')
  const [message, setMessage] = useState<{ readonly text: string; readonly failed: boolean } | null>(null)
  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (title.trim() === '' || pending) return
    setPending(true)
    try {
      const result = await createTask({ title, relatedType: relatedType ?? null, relatedId: relatedId ?? null })
      setMessage({ text: result.ok ? copy.created : result.error.message, failed: !result.ok })
      if (result.ok) {
        setTitle('')
        router.refresh()
      }
    } catch {
      // The request never got an answer (offline, or the server action threw); say so and let the person retry.
      setMessage({ text: copy.failed, failed: true })
    } finally {
      setPending(false)
    }
  }
  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        void submit(event)
      }}
    >
      <label htmlFor="new-task-title" className="sr-only">
        {copy.label}
      </label>
      <input
        id="new-task-title"
        name="title"
        autoComplete="off"
        value={title}
        onChange={(event) => {
          setTitle(event.target.value)
          setMessage(null)
        }}
        placeholder={
          contextLabel === undefined ? copy.placeholder : copy.placeholderFor.replace('{name}', contextLabel)
        }
        className="rounded-md border px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={pending || title.trim() === ''}
        className="ops-action-button rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
      >
        {pending ? copy.adding : copy.add}
      </button>
      {message === null ? null : (
        // A success only moves the count and adds a row, so its message is for screen readers; a failure stays visible.
        <span role="status" className={message.failed ? 'self-center text-xs text-destructive' : 'sr-only'}>
          {message.text}
        </span>
      )}
    </form>
  )
}
