'use client'

import { useState } from 'react'
import { ConfirmDialog } from '@ops/ui/composites/ConfirmDialog'
import { CopyButton } from '../copy-button'
import { describeClientError } from '../client-errors'
import type { ResendAction, RevokeAction } from './form-utils'

function InvitationMessage({ message, inviteUrl }: Readonly<{ message: string | undefined; inviteUrl: string }>) {
  if (message === undefined) return null
  return (
    <span className="text-xs text-muted-foreground" role="status" aria-live="polite">
      {message}
      {inviteUrl === '' ? null : (
        <span className="ml-1 inline-flex items-center gap-1 break-all">
          {inviteUrl}
          <CopyButton value={inviteUrl} label="invitation link" />
        </span>
      )}
    </span>
  )
}

export function InvitationActions({
  id,
  resendAction,
  revokeAction,
  canRevoke = true,
}: Readonly<{ id: string; resendAction: ResendAction; revokeAction: RevokeAction; canRevoke?: boolean }>) {
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
      setMessage(result.ok ? 'Invitation resent.' : result.error.message)
    } catch (error) {
      setMessage(
        describeClientError(error, {
          context: 'invitation resend',
          fallback: 'Unable to resend invitation. Try again.',
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
      setMessage(result.ok ? 'Invitation revoked.' : result.error.message)
    } catch (error) {
      setMessage(
        describeClientError(error, {
          context: 'invitation revoke',
          fallback: 'Unable to revoke invitation. Try again.',
        }),
      )
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className="text-xs font-medium text-primary hover:underline"
        type="button"
        disabled={pending !== null}
        onClick={() => {
          void resend()
        }}
      >
        {pending === 'resend' ? 'Resending…' : 'Resend'}
      </button>
      {canRevoke ? (
        <ConfirmDialog
          title="Revoke invitation?"
          description="This invitation link will stop working immediately."
          labels={{ cancel: 'Cancel', confirm: 'Revoke invitation', confirming: 'Revoking…' }}
          destructive
          onConfirm={revoke}
          trigger={
            <button
              className="text-xs font-medium text-destructive hover:underline"
              type="button"
              disabled={pending !== null}
            >
              {pending === 'revoke' ? 'Revoking…' : 'Revoke'}
            </button>
          }
        />
      ) : null}
      <InvitationMessage message={message} inviteUrl={inviteUrl} />
    </div>
  )
}
