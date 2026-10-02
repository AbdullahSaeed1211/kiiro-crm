'use client'

import { useState, type SyntheticEvent } from 'react'
import { describeClientError } from '../client-errors'
import { formText, type GroupAction } from './form-utils'
import { Button } from '@ops/ui/components/ui/button'

export function GroupForm({ action }: Readonly<{ action: GroupAction }>) {
  const [name, setName] = useState('')
  const [message, setMessage] = useState<string>()
  const [pending, setPending] = useState(false)

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const submittedName = formText(values, 'name')
    setPending(true)
    try {
      const result = await action({ name: submittedName })
      setMessage(result.ok ? 'Group saved.' : result.error.message)
      if (result.ok) setName('')
    } catch (error) {
      setMessage(describeClientError(error, { context: 'group save', fallback: 'Unable to save group. Try again.' }))
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_auto]"
      onSubmit={(event) => {
        void submit(event)
      }}
    >
      <label className="sr-only" htmlFor="group-name">
        Group name
      </label>
      <input
        id="group-name"
        name="name"
        autoComplete="off"
        className="h-10 rounded-md border px-3"
        onChange={(event) => {
          setName(event.target.value)
        }}
        placeholder="Sales"
        required
        value={name}
        disabled={pending}
      />
      <Button size="lg" type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Create group'}
      </Button>
      {message !== undefined && (
        <p className="text-sm text-muted-foreground sm:col-span-2" role="status" aria-live="polite">
          {message}
        </p>
      )}
    </form>
  )
}
