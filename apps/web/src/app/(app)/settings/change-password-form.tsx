'use client'

import { useState, type SyntheticEvent } from 'react'
import { Button } from '@ops/ui/components/ui/button'
import { settingText } from '../../../i18n/settings-form-copy'
import { useLocale } from '../../../i18n/locale-context'

type PasswordField = 'currentPassword' | 'newPassword' | 'confirmPassword'

const fields: readonly { name: PasswordField; label: string; autoComplete: string }[] = [
  { name: 'currentPassword', label: 'Current password', autoComplete: 'current-password' },
  { name: 'newPassword', label: 'New password', autoComplete: 'new-password' },
  { name: 'confirmPassword', label: 'Confirm new password', autoComplete: 'new-password' },
]

function passwordsMatch(values: Readonly<Record<PasswordField, string>>): boolean {
  return values.newPassword === values.confirmPassword
}

function PasswordFields({
  values,
  pending,
  locale,
  onChange,
}: Readonly<{
  values: Readonly<Record<PasswordField, string>>
  pending: boolean
  locale: 'en' | 'es'
  onChange: (field: PasswordField, value: string) => void
}>) {
  return fields.map((field) => (
    <label className="grid gap-1 text-sm" key={field.name}>
      <span className="font-medium">{settingText(field.label, locale)}</span>
      <input
        className="h-10 rounded-md border bg-background px-3 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        name={field.name}
        type="password"
        autoComplete={field.autoComplete}
        minLength={field.name === 'currentPassword' ? undefined : 12}
        required
        value={values[field.name]}
        onChange={(event) => {
          onChange(field.name, event.target.value)
        }}
        disabled={pending}
      />
    </label>
  ))
}

export function ChangePasswordForm() {
  const locale = useLocale()
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
    if (!passwordsMatch(values)) {
      setError(settingText('New passwords do not match.', locale))
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
        setError(settingText(typeof data.error === 'string' ? data.error : 'Unable to change password.', locale))
        return
      }
      setValues({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setMessage(settingText('Password changed successfully.', locale))
    } catch {
      setError(settingText('Unable to reach the server. Try again.', locale))
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
      <PasswordFields
        values={values}
        pending={pending}
        locale={locale}
        onChange={(field, value) => {
          setValues((current) => ({ ...current, [field]: value }))
        }}
      />
      <p className="text-xs text-muted-foreground">
        {settingText('Use 12–128 characters. Your new password cannot equal your email.', locale)}
      </p>
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
      <Button size="lg" disabled={pending} type="submit">
        {pending ? settingText('Changing…', locale) : settingText('Change password', locale)}
      </Button>
    </form>
  )
}
