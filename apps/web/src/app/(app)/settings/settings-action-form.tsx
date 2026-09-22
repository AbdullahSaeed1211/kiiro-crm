'use client'
/* eslint-disable @typescript-eslint/no-confusing-void-expression */

import { useRouter } from 'next/navigation'
import { useState, type SyntheticEvent } from 'react'
import { SearchableSelect } from './searchable-select'

interface Result {
  readonly ok: boolean
  readonly error?: string
  readonly data?: unknown
}
type Action = (input: unknown) => Promise<Result>

interface Field {
  name: string
  label: string
  type?: 'text' | 'number' | 'email' | 'select'
  searchable?: boolean
  options?: readonly { value: string; label: string }[]
}

function FieldControl({
  field,
  value,
  onChange,
}: Readonly<{ field: Field; value: string; onChange: (value: string) => void }>) {
  if (field.type === 'select' && field.searchable === true)
    return (
      <SearchableSelect
        id={`setting-${field.name}`}
        label={field.label}
        options={field.options ?? []}
        value={value}
        onChange={onChange}
      />
    )
  if (field.type === 'select')
    return (
      <select
        className="h-10 rounded-md border bg-background px-3 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        name={field.name}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {(field.options ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )
  return (
    <input
      className="h-10 rounded-md border bg-background px-3 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      name={field.name}
      autoComplete="off"
      onChange={(event) => onChange(event.target.value)}
      type={field.type ?? 'text'}
      value={value}
    />
  )
}

export function SettingsActionForm({
  action,
  fields,
  fixedValues = {},
  initialValues = {},
  submitLabel,
}: Readonly<{
  action: Action
  fields: readonly Field[]
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
          <FieldControl
            field={field}
            value={values[field.name] ?? ''}
            onChange={(value) => setValues((current) => ({ ...current, [field.name]: value }))}
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
        className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        disabled={pending}
        type="submit"
      >
        {pending ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
