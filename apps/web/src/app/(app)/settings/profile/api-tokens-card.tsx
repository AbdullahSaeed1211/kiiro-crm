'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useGuardedTransition } from '../../use-guarded-transition'
import { makeApiToken, removeApiToken } from '../../../../server/actions/settings/api-tokens'
import { settingText } from '../../../../i18n/settings-form-copy'
import { useLocale } from '../../../../i18n/locale-context'

export interface TokenRow {
  readonly id: string
  readonly name: string
  readonly createdAt: number
  readonly lastUsedAt: number | null
}

function day(time: number | null, locale: 'en' | 'es'): string {
  if (time === null) return settingText('never', locale)
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(
    time,
  )
}

function TokenCreationForm({
  name,
  setName,
  make,
  pending,
  message,
  locale,
}: Readonly<{
  name: string
  setName: (value: string) => void
  make: () => void
  pending: boolean
  message: string | null
  locale: 'en' | 'es'
}>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        aria-label={settingText('New token label', locale)}
        placeholder={settingText('Name, for example Zapier', locale)}
        className="max-w-60"
        value={name}
        onChange={(event) => {
          setName(event.target.value)
        }}
      />
      <Button variant="outline" size="sm" disabled={pending || name.trim() === ''} onClick={make}>
        {settingText('Make a token', locale)}
      </Button>
      {message === null ? null : <span role="status">{settingText(message, locale)}</span>}
    </div>
  )
}

/** Personal API tokens: make one for a script or an automation tool, see when each was used, revoke it. */
export function ApiTokensCard({ tokens }: Readonly<{ tokens: readonly TokenRow[] }>) {
  const locale = useLocale()
  const router = useRouter()
  const [name, setName] = useState('')
  const [fresh, setFresh] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useGuardedTransition(setMessage)
  const make = () => {
    startTransition(async () => {
      const result = await makeApiToken({ name })
      if (result.ok) {
        setFresh(result.data.token)
        setName('')
        setMessage(null)
        router.refresh()
      } else setMessage(result.error.message)
    })
  }
  const revoke = (tokenId: string) => {
    startTransition(async () => {
      const result = await removeApiToken({ tokenId })
      setMessage(result.ok ? settingText('Revoked.', locale) : settingText(result.error.message, locale))
      if (result.ok) router.refresh()
    })
  }
  return (
    <div className="grid gap-3">
      {fresh === null ? null : (
        <div className="grid gap-1 rounded-md border p-3" role="status">
          <p className="font-medium">{settingText('Copy your token now. It is not shown again.', locale)}</p>
          <Input
            readOnly
            aria-label={settingText('New API token', locale)}
            className="font-mono text-xs"
            value={fresh}
          />
          <p className="text-muted-foreground">
            {settingText('Send it as', locale)} <code>Authorization: Bearer &lt;token&gt;</code>.{' '}
            {settingText('It can do whatever you can.', locale)}
          </p>
        </div>
      )}
      {tokens.length === 0 ? null : (
        <ul className="divide-y">
          {tokens.map((token) => (
            <li key={token.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                <span className="font-medium">{token.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {settingText('Made', locale)} {day(token.createdAt, locale)} · {settingText('last used', locale)}{' '}
                  {day(token.lastUsedAt, locale)}
                </span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                aria-label={`${settingText('Revoke', locale)} ${token.name}`}
                onClick={() => {
                  revoke(token.id)
                }}
              >
                {settingText('Revoke', locale)}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <TokenCreationForm
        name={name}
        setName={setName}
        make={make}
        pending={pending}
        message={message}
        locale={locale}
      />
    </div>
  )
}
