'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { makeApiToken, removeApiToken } from '../../../../server/actions/settings/api-tokens'

export interface TokenRow {
  readonly id: string
  readonly name: string
  readonly createdAt: number
  readonly lastUsedAt: number | null
}

const day = (time: number | null): string =>
  time === null ? 'never' : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(time)

/** Personal API tokens: make one for a script or an automation tool, see when each was used, revoke it. */
export function ApiTokensCard({ tokens }: Readonly<{ tokens: readonly TokenRow[] }>) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [fresh, setFresh] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
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
      setMessage(result.ok ? 'Revoked.' : result.error.message)
      if (result.ok) router.refresh()
    })
  }
  return (
    <div className="grid gap-3">
      {fresh === null ? null : (
        <div className="grid gap-1 rounded-md border p-3" role="status">
          <p className="font-medium">Copy your token now. It is not shown again.</p>
          <Input readOnly aria-label="New API token" className="font-mono text-xs" value={fresh} />
          <p className="text-muted-foreground">
            Send it as <code>Authorization: Bearer &lt;token&gt;</code>. It can do whatever you can.
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
                  Made {day(token.createdAt)} · last used {day(token.lastUsedAt)}
                </span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                aria-label={`Revoke ${token.name}`}
                onClick={() => {
                  revoke(token.id)
                }}
              >
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Token name"
          placeholder="Name, for example Zapier"
          className="max-w-60"
          value={name}
          onChange={(event) => {
            setName(event.target.value)
          }}
        />
        <Button variant="outline" size="sm" disabled={pending || name.trim() === ''} onClick={make}>
          Make a token
        </Button>
        {message === null ? null : <span role="status">{message}</span>}
      </div>
    </div>
  )
}
