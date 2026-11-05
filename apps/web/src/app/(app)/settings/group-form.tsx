'use client'

import { useState, type SyntheticEvent } from 'react'
import { describeClientError } from '../client-errors'
import { formText, type GroupAction } from './form-utils'
import { Button } from '@ops/ui/components/ui/button'
import { catalogFor } from '../../../i18n/locale'
import { useLocale } from '../../../i18n/locale-context'
import { GROUPS_COPY } from '../../../i18n/groups-copy'

export function GroupForm({ action }: Readonly<{ action: GroupAction }>) {
  const copy = catalogFor(GROUPS_COPY, useLocale())
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
      setMessage(result.ok ? copy.saved : result.error.message)
      if (result.ok) setName('')
    } catch (error) {
      setMessage(describeClientError(error, { context: 'group save', fallback: copy.saveFailed }))
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
        {copy.groupName}
      </label>
      <input
        id="group-name"
        name="name"
        autoComplete="off"
        className="h-10 rounded-md border px-3"
        onChange={(event) => {
          setName(event.target.value)
        }}
        placeholder={copy.namePlaceholder}
        required
        value={name}
        disabled={pending}
      />
      <Button size="lg" type="submit" disabled={pending}>
        {pending ? copy.saving : copy.create}
      </Button>
      {message !== undefined && (
        <p className="text-sm text-muted-foreground sm:col-span-2" role="status" aria-live="polite">
          {message}
        </p>
      )}
    </form>
  )
}
