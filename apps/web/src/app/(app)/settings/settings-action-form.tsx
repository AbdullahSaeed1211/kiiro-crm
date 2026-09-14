'use client'
/* eslint-disable @typescript-eslint/no-confusing-void-expression */

import { useRouter } from 'next/navigation'
import { useState, type SyntheticEvent } from 'react'

interface Result {
  readonly ok: boolean
  readonly error?: string
  readonly data?: unknown
}
type Action = (input: unknown) => Promise<Result>

export function SettingsActionForm({
  action,
  fields,
  fixedValues = {},
  initialValues = {},
  submitLabel,
}: Readonly<{
  action: Action
  fields: readonly { name: string; label: string; type?: 'text' | 'number' | 'email' }[]
  fixedValues?: Readonly<Record<string, unknown>>
  initialValues?: Readonly<Record<string, string | number>>
  submitLabel: string
}>) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((field) => [field.name, String(initialValues[field.name] ?? '')])),
  )
  const [result, setResult] = useState<Result | undefined>()
  const [pending, setPending] = useState(false)
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setResult(undefined)
    const response = await action({ ...fixedValues, ...values })
    setResult(response)
    setPending(false)
    if (response.ok) router.refresh()
  }
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        void submit(event)
      }}
    >
      {fields.map((field) => (
        <label className="grid gap-1 text-sm" key={field.name}>
          <span className="font-medium">{field.label}</span>
          <input
            className="h-10 rounded-md border bg-background px-3"
            name={field.name}
            autoComplete="off"
            onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
            type={field.type ?? 'text'}
            value={values[field.name] ?? ''}
          />
        </label>
      ))}
      {result?.ok === false && (
        <p className="text-sm text-destructive" role="alert">
          {result.error}
        </p>
      )}
      {result?.ok === true && (
        <p className="text-sm text-muted-foreground" role="status">
          Saved.
        </p>
      )}
      <button
        className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        disabled={pending}
        type="submit"
      >
        {pending ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
