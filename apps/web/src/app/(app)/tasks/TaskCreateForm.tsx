'use client'

import { createTask } from '../../../server/actions/work/tasks/createTask'
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
  const [title, setTitle] = useState(initialTitle ?? '')
  const [message, setMessage] = useState<string | null>(null)
  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = await createTask({ title, relatedType: relatedType ?? null, relatedId: relatedId ?? null })
    setMessage(result.ok ? 'Task created.' : result.error.message)
    if (result.ok) {
      setTitle('')
      router.refresh()
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
        Task title
      </label>
      <input
        id="new-task-title"
        name="title"
        autoComplete="off"
        value={title}
        onChange={(event) => {
          setTitle(event.target.value)
        }}
        placeholder={contextLabel === undefined ? 'New task…' : `Task for ${contextLabel}…`}
        className="rounded-md border px-3 py-2 text-sm"
      />
      <button
        type="submit"
        className="ops-action-button rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
      >
        Add
      </button>
      {message === null ? null : (
        <span role="status" className="self-center text-xs text-muted-foreground">
          {message}
        </span>
      )}
    </form>
  )
}
