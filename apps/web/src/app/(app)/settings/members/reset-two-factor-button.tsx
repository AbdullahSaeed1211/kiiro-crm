'use client'

import { Button } from '@ops/ui/components/ui/button'
import { useState, useTransition } from 'react'
import { resetMemberTwoFactor } from '../../../../server/actions/settings/two-factor'

/** Owners clear a teammate's two-step sign-in after a lost phone. */
export function ResetTwoFactorButton({ userId, name }: Readonly<{ userId: string; name: string }>) {
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  return (
    <span className="inline-flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        aria-label={`Reset two-step sign-in for ${name}`}
        onClick={() => {
          startTransition(async () => {
            const result = await resetMemberTwoFactor({ userId })
            setMessage(result.ok ? 'Reset.' : result.error.message)
          })
        }}
      >
        Reset two-step
      </Button>
      {message === null ? null : (
        <span role="status" className="text-xs">
          {message}
        </span>
      )}
    </span>
  )
}
