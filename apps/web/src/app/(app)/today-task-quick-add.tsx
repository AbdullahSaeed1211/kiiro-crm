'use client'

import { Button } from '@ops/ui/components/ui/button'
import { useRouter } from 'next/navigation'
import { useRef, useState, type SyntheticEvent } from 'react'
import { createTodayTask } from '../../server/actions/work/tasks/createTask'
import { DASHBOARD_TODAY_COPY } from '../../i18n/dashboard-today-copy'
import type { Locale } from '../../i18n/locale'

/** Adds a server-assigned task to the signed-in person's Today and My tasks queues. */
export function TodayTaskQuickAdd({
  locale,
  focusPersonalAfterCreate = false,
}: Readonly<{ locale: Locale; focusPersonalAfterCreate?: boolean }>) {
  const copy = DASHBOARD_TODAY_COPY[locale]
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<{ text: string; failed: boolean } | null>(null)

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || title.trim() === '') return
    setPending(true)
    try {
      const result = await createTodayTask({ title })
      if (result.ok) {
        setTitle('')
        setMessage({ text: copy.taskAdded, failed: false })
        if (focusPersonalAfterCreate) router.push('/?scope=mine')
        else router.refresh()
        inputRef.current?.focus()
      } else {
        setMessage({ text: result.error.message, failed: true })
      }
    } catch {
      setMessage({ text: copy.taskFailed, failed: true })
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-2 rounded-xl border bg-card p-4 sm:flex-row"
    >
      <label htmlFor="today-task-title" className="sr-only">
        {copy.taskTitle}
      </label>
      <input
        ref={inputRef}
        id="today-task-title"
        name="title"
        autoComplete="off"
        value={title}
        onChange={(event) => {
          setTitle(event.target.value)
          setMessage(null)
        }}
        placeholder={copy.taskPlaceholder}
        className="min-h-10 min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm"
      />
      <Button type="submit" disabled={pending || title.trim() === ''} className="min-h-10 shrink-0">
        {pending ? copy.addingTask : copy.addTask}
      </Button>
      {message === null ? null : (
        <span role="status" className={message.failed ? 'text-sm text-destructive sm:self-center' : 'sr-only'}>
          {message.text}
        </span>
      )}
    </form>
  )
}
