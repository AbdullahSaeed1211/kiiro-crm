'use client'

import Link from 'next/link'
import type { ReactNode, SyntheticEvent } from 'react'
import { useState } from 'react'

interface AuthFormProps {
  readonly endpoint: string
  readonly submitLabel: string
  readonly fields: readonly ('email' | 'password' | 'name' | 'confirm')[]
  readonly hidden?: Readonly<Record<string, string>>
  readonly footer?: ReactNode
}

type AuthField = AuthFormProps['fields'][number]
interface AuthResponse {
  readonly error?: string
  readonly redirect?: string
  readonly message?: string
  readonly ok?: boolean
}
function fieldLabel(field: AuthField): string {
  if (field === 'confirm') return 'Confirm password'
  return field[0].toUpperCase() + field.slice(1)
}
function fieldType(field: AuthField): string {
  if (field === 'email') return 'email'
  if (field === 'name') return 'text'
  return 'password'
}
function mismatch(form: FormData): boolean {
  const password = form.get('password')
  const confirm = form.get('confirm')
  return typeof password === 'string' && typeof confirm === 'string' && password !== confirm
}
async function send(
  endpoint: string,
  values: Record<string, FormDataEntryValue>,
): Promise<AuthResponse & { ok: boolean }> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(values),
  })
  const result: unknown = await response.json()
  const data = typeof result === 'object' && result !== null ? (result as AuthResponse) : {}
  return { ...data, ok: response.ok }
}

export function AuthForm({ endpoint, submitLabel, fields, hidden, footer }: AuthFormProps) {
  const [error, setError] = useState<string | undefined>()
  const [pending, setPending] = useState(false)
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(undefined)
    setPending(true)
    const form = new FormData(event.currentTarget)
    const values = Object.fromEntries(form.entries())
    if (mismatch(form)) {
      setError('Passwords do not match.')
      setPending(false)
      return
    }
    try {
      const data = await send(endpoint, values)
      if (!data.ok) setError(data.error ?? 'Unable to continue.')
      else if (data.redirect !== undefined) window.location.assign(data.redirect)
      else setError(data.message ?? 'Check your email for the next step.')
    } catch {
      setError('Unable to reach the server. Try again.')
    } finally {
      setPending(false)
    }
  }
  return (
    <form
      onSubmit={(event) => {
        void submit(event)
      }}
      className="w-full max-w-sm space-y-5 rounded-xl border bg-background p-6 shadow-sm"
    >
      <div>
        <p className="text-sm font-medium text-muted-foreground">Workspace</p>
        <h1 className="text-2xl font-semibold tracking-tight">{submitLabel}</h1>
      </div>
      {fields.map((field) => (
        <label className="block space-y-1.5 text-sm" key={field}>
          <span className="font-medium">{fieldLabel(field)}</span>
          <input
            className="h-10 w-full rounded-md border bg-background px-3"
            name={field}
            type={fieldType(field)}
            required
            autoComplete={field === 'password' || field === 'confirm' ? 'new-password' : field}
          />
        </label>
      ))}
      {Object.entries(hidden ?? {}).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      {error !== undefined && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <button
        className="h-10 w-full rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        disabled={pending}
        type="submit"
      >
        {pending ? 'Working...' : submitLabel}
      </button>
      {footer ?? (
        <Link
          className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          href="/login"
        >
          Back to login
        </Link>
      )}
    </form>
  )
}
