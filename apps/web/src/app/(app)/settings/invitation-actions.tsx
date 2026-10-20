'use client'

import { useState } from 'react'
import { ConfirmDialog } from '@ops/ui/composites/ConfirmDialog'
import { CopyButton } from '../copy-button'
import { describeClientError } from '../client-errors'
import type { ResendAction, RevokeAction } from './form-utils'
import { Button } from '@ops/ui/components/ui/button'
import { settingText } from '../../../i18n/settings-form-copy'
import { useLocale } from '../../../i18n/locale-context'

function InvitationMessage({
  message,
  inviteUrl,
  locale,
}: Readonly<{ message: string | undefined; inviteUrl: string; locale: 'en' | 'es' }>) {
  if (message === undefined) return null
  return (
    <span className="text-xs text-muted-foreground" role="status" aria-live="polite">
      {message}
      {inviteUrl === '' ? null : (
        <span className="ml-1 inline-flex items-center gap-1 break-all">
          {inviteUrl}
          <CopyButton value={inviteUrl} label={settingText('Invitation link', locale)} />
        </span>
      )}
    </span>
  )
}

function RevokeInvitationButton({
  pending,
  onRevoke,
  locale,
}: Readonly<{ pending: 'resend' | 'revoke' | null; onRevoke: () => Promise<void>; locale: 'en' | 'es' }>) {
  return (
    <ConfirmDialog
      title={settingText('Revoke invitation?', locale)}
      description={settingText('This invitation link will stop working immediately.', locale)}
      labels={{
        cancel: settingText('Cancel', locale),
        confirm: settingText('Revoke invitation', locale),
        confirming: settingText('Revoking…', locale),
      }}
      destructive
      onConfirm={onRevoke}
      trigger={
        <Button variant="link" size="sm" className="text-destructive" type="button" disabled={pending !== null}>
          {pending === 'revoke' ? settingText('Revoking…', locale) : settingText('Revoke', locale)}
        </Button>
      }
    />
  )
}

export function InvitationActions({
  id,
  resendAction,
  revokeAction,
  canRevoke = true,
}: Readonly<{ id: string; resendAction: ResendAction; revokeAction: RevokeAction; canRevoke?: boolean }>) {
  const locale = useLocale()
  const [pending, setPending] = useState<'resend' | 'revoke' | null>(null)
  const [message, setMessage] = useState<string>()
  const [inviteUrl, setInviteUrl] = useState('')

  const resend = async () => {
    setPending('resend')
    setMessage(undefined)
    setInviteUrl('')
    try {
      const result = await resendAction({ id })
      setInviteUrl(result.ok ? result.data.inviteUrl : '')
      setMessage(result.ok ? settingText('Invitation resent.', locale) : settingText(result.error.message, locale))
    } catch (error) {
      setMessage(
        describeClientError(error, {
          context: 'invitation resend',
          fallback: settingText('Unable to resend invitation. Try again.', locale),
        }),
      )
    } finally {
      setPending(null)
    }
  }

  const revoke = async () => {
    setPending('revoke')
    setMessage(undefined)
    try {
      const result = await revokeAction({ id })
      setMessage(result.ok ? settingText('Invitation revoked.', locale) : settingText(result.error.message, locale))
    } catch (error) {
      setMessage(
        describeClientError(error, {
          context: 'invitation revoke',
          fallback: settingText('Unable to revoke invitation. Try again.', locale),
        }),
      )
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="link"
        size="sm"
        type="button"
        disabled={pending !== null}
        onClick={() => {
          void resend()
        }}
      >
        {pending === 'resend' ? settingText('Resending…', locale) : settingText('Resend', locale)}
      </Button>
      {canRevoke ? <RevokeInvitationButton pending={pending} onRevoke={revoke} locale={locale} /> : null}
      <InvitationMessage
        message={message === undefined ? undefined : settingText(message, locale)}
        inviteUrl={inviteUrl}
        locale={locale}
      />
    </div>
  )
}
