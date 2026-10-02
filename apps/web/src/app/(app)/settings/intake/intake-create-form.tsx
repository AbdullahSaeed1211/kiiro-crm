'use client'

import { useRouter } from 'next/navigation'
import { useState, type SyntheticEvent } from 'react'
import type { ActionResult } from '../../../../server/actions/settings'
import { Button } from '@ops/ui/components/ui/button'

const inputClass = 'h-10 rounded-md border bg-background px-3 text-sm'

type Action = (input: unknown) => Promise<ActionResult>

function resultMessage(result: ActionResult | undefined): string | undefined {
  if (result?.ok === false) return result.error.message
  if (result?.ok === true) return 'Saved.'
  return undefined
}

export function IntakeCreateForm({ action }: Readonly<{ action: Action }>) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [result, setResult] = useState<ActionResult | undefined>()
  const [pending, setPending] = useState(false)
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    try {
      const response = await action({ name, key })
      setResult(response)
      if (response.ok) {
        setName('')
        setKey('')
        router.refresh()
      }
    } catch {
      setResult({ ok: false, error: { code: 'INTERNAL', message: 'Could not create this form. Please try again.' } })
    } finally {
      setPending(false)
    }
  }
  return (
    <form className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={(event) => void submit(event)}>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Form name</span>
        <input
          className={inputClass}
          onChange={(event) => {
            setName(event.target.value)
          }}
          value={name}
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Public key</span>
        <input
          className={inputClass}
          pattern="[a-z0-9-]{2,60}"
          onChange={(event) => {
            setKey(event.target.value.toLowerCase())
          }}
          placeholder="website-contact"
          value={key}
        />
      </label>
      <Button size="lg" disabled={pending} type="submit">
        {pending ? 'Creating...' : 'Create form'}
      </Button>
      {resultMessage(result) && (
        <p
          className={`text-sm sm:col-span-3 ${result?.ok === false ? 'text-destructive' : 'text-muted-foreground'}`}
          role={result?.ok === false ? 'alert' : 'status'}
        >
          {resultMessage(result)}
        </p>
      )}
    </form>
  )
}
