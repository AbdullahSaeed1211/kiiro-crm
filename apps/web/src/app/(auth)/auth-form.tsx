'use client'

import Link from 'next/link'
import type { ReactNode, SyntheticEvent } from 'react'
import { useState } from 'react'
import { Button } from '@ops/ui/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ops/ui/components/ui/card'
import { Input } from '@ops/ui/components/ui/input'
import { Label } from '@ops/ui/components/ui/label'

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
    <Card className="w-full">
      <form
        onSubmit={(event) => {
          void submit(event)
        }}
        className="ops-auth-form"
      >
        <CardHeader>
          <CardTitle className="text-xl">{submitLabel}</CardTitle>
          <CardDescription>Use your team account to continue.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field) => (
            <div className="space-y-2" key={field}>
              <Label htmlFor={`auth-${field}`}>{fieldLabel(field)}</Label>
              <Input
                id={`auth-${field}`}
                className="h-9"
                name={field}
                type={fieldType(field)}
                required
                autoComplete={field === 'password' || field === 'confirm' ? 'current-password' : field}
              />
            </div>
          ))}
          {Object.entries(hidden ?? {}).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
          {error !== undefined && (
            <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button className="w-full" disabled={pending} size="lg" type="submit">
            {pending ? 'Working…' : submitLabel}
          </Button>
          {footer ?? (
            <Link
              className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              href="/login"
            >
              Back to login
            </Link>
          )}
        </CardContent>
      </form>
    </Card>
  )
}
