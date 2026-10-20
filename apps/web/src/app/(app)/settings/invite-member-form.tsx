'use client'

import { useState, type SyntheticEvent } from 'react'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { CopyButton } from '../copy-button'
import { describeClientError } from '../client-errors'
import { formText, type InviteAction } from './form-utils'
import { Button } from '@ops/ui/components/ui/button'
import { settingText } from '../../../i18n/settings-form-copy'
import { useLocale } from '../../../i18n/locale-context'

function InviteFormMessage({
  message,
  inviteUrl,
  locale,
}: Readonly<{ message: string | undefined; inviteUrl: string; locale: 'en' | 'es' }>) {
  if (message === undefined) return null
  return (
    <div className="text-sm text-muted-foreground sm:col-span-3" role="status" aria-live="polite">
      <span>{message}</span>
      {inviteUrl === '' ? null : (
        <span className="mt-1 flex items-center gap-1 break-all text-xs">
          {inviteUrl}
          <CopyButton value={inviteUrl} label={settingText('Invitation link', locale)} />
        </span>
      )}
    </div>
  )
}

function InviteFormFields({
  email,
  role,
  pending,
  onEmailChange,
  onRoleChange,
  locale,
}: Readonly<{
  email: string
  role: string
  pending: boolean
  onEmailChange: (value: string) => void
  onRoleChange: (value: string) => void
  locale: 'en' | 'es'
}>) {
  return (
    <>
      <label className="sr-only" htmlFor="invite-member-email">
        {settingText('Teammate email', locale)}
      </label>
      <input
        id="invite-member-email"
        name="email"
        autoComplete="email"
        className="h-10 rounded-md border px-3"
        onChange={(event) => {
          onEmailChange(event.target.value)
        }}
        placeholder="teammate@example.com"
        required
        spellCheck={false}
        type="email"
        value={email}
        disabled={pending}
      />
      <label className="sr-only" htmlFor="invite-member-role">
        {settingText('Member role', locale)}
      </label>
      <NativeSelect
        id="invite-member-role"
        name="role"
        autoComplete="off"
        onChange={(event) => {
          onRoleChange(event.target.value)
        }}
        value={role}
        disabled={pending}
      >
        <option value="staff">Staff</option>
        <option value="manager">Manager</option>
        <option value="owner">Owner</option>
      </NativeSelect>
      <Button size="lg" type="submit" disabled={pending}>
        {pending ? settingText('Inviting…', locale) : settingText('Invite', locale)}
      </Button>
    </>
  )
}

export function InviteMemberForm({ action }: Readonly<{ action: InviteAction }>) {
  const locale = useLocale()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('staff')
  const [message, setMessage] = useState<string>()
  const [inviteUrl, setInviteUrl] = useState('')
  const [pending, setPending] = useState(false)

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const submittedEmail = formText(values, 'email')
    const submittedRole = formText(values, 'role')
    setPending(true)
    setInviteUrl('')
    try {
      const result = await action({ email: submittedEmail, role: submittedRole })
      const nextInviteUrl = result.ok ? result.data.inviteUrl : ''
      setInviteUrl(nextInviteUrl)
      setMessage(result.ok ? 'Invitation created.' : result.error.message)
      if (result.ok) setEmail('')
    } catch (error) {
      setMessage(
        describeClientError(error, {
          context: 'invitation create',
          fallback: settingText('Unable to create invitation. Try again.', locale),
        }),
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_10rem_auto]"
      onSubmit={(event) => {
        void submit(event)
      }}
    >
      <InviteFormFields
        email={email}
        role={role}
        pending={pending}
        onEmailChange={setEmail}
        onRoleChange={setRole}
        locale={locale}
      />
      <InviteFormMessage
        message={message === undefined ? undefined : settingText(message, locale)}
        inviteUrl={inviteUrl}
        locale={locale}
      />
    </form>
  )
}
