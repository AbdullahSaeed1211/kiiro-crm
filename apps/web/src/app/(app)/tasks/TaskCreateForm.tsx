'use client'

import { createTask } from '../../../server/actions/work/tasks/createTask'
import { useState, type SyntheticEvent } from 'react'

export function TaskCreateForm() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = await createTask({ title })
    setMessage(result.ok ? 'Task created.' : result.error.message)
    if (result.ok) setTitle('')
  }
  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        void submit(event)
      }}
    >
      <input
        value={title}
        onChange={(event) => {
          setTitle(event.target.value)
        }}
        placeholder="New task"
        className="rounded-md border px-3 py-2 text-sm"
      />
      <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">
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
