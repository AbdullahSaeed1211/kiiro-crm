'use client'

import { Button } from '@ops/ui/components/ui/button'
import { useState } from 'react'
import { useGuardedTransition } from '../../use-guarded-transition'
import { resetMemberTwoFactor } from '../../../../server/actions/settings/two-factor'
import { settingText } from '../../../../i18n/settings-form-copy'
import { useLocale } from '../../../../i18n/locale-context'

/** Owners clear a teammate's two-step sign-in after a lost phone. */
export function ResetTwoFactorButton({ userId, name }: Readonly<{ userId: string; name: string }>) {
  const locale = useLocale()
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useGuardedTransition(setMessage)
  return (
    <span className="inline-flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        aria-label={`${settingText('Reset two-step sign-in for', locale)} ${name}`}
        onClick={() => {
          startTransition(async () => {
            const result = await resetMemberTwoFactor({ userId })
            setMessage(result.ok ? settingText('Reset.', locale) : settingText(result.error.message, locale))
          })
        }}
      >
        {settingText('Reset two-step', locale)}
      </Button>
      {message === null ? null : (
        <span role="status" className="text-xs">
          {settingText(message, locale)}
        </span>
      )}
    </span>
  )
}
