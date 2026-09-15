'use client'
/* eslint-disable max-lines-per-function -- password form keeps validation, request state, and feedback together. */

import { useState, type SyntheticEvent } from 'react'

type PasswordField = 'currentPassword' | 'newPassword' | 'confirmPassword'

const fields: readonly { name: PasswordField; label: string; autoComplete: string }[] = [
  { name: 'currentPassword', label: 'Current password', autoComplete: 'current-password' },
  { name: 'newPassword', label: 'New password', autoComplete: 'new-password' },
  { name: 'confirmPassword', label: 'Confirm new password', autoComplete: 'new-password' },
]

export function ChangePasswordForm() {
  const [values, setValues] = useState<Record<PasswordField, string>>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(undefined)
    setError(undefined)
    if (values.newPassword !== values.confirmPassword) {
      setError('New passwords do not match.')
      return
    }
    setPending(true)
    try {
      const response = await fetch('/api/v1/auth/change-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currentPassword: values.currentPassword, newPassword: values.newPassword }),
      })
      const payload: unknown = await response.json()
      const data = typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {}
      if (!response.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Unable to change password.')
        return
      }
      setValues({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setMessage('Password changed successfully.')
    } catch {
      setError('Unable to reach the server. Try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      className="mt-4 max-w-md space-y-4"
      onSubmit={(event) => {
        void submit(event)
      }}
    >
      {fields.map((field) => (
        <label className="grid gap-1 text-sm" key={field.name}>
          <span className="font-medium">{field.label}</span>
          <input
            className="h-10 rounded-md border bg-background px-3 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            name={field.name}
            type="password"
            autoComplete={field.autoComplete}
            minLength={field.name === 'currentPassword' ? undefined : 12}
            required
            value={values[field.name]}
            onChange={(event) => {
              setValues((current) => ({ ...current, [field.name]: event.target.value }))
            }}
            disabled={pending}
          />
        </label>
      ))}
      <p className="text-xs text-muted-foreground">Use 12–128 characters. Your new password cannot equal your email.</p>
      {error === undefined ? null : (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {message === undefined ? null : (
        <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
          {message}
        </p>
      )}
      <button
        className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        disabled={pending}
        type="submit"
      >
        {pending ? 'Changing…' : 'Change password'}
      </button>
    </form>
  )
}
