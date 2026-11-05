'use client'

import { Button } from '@ops/ui/components/ui/button'
import { ConfirmDialog } from '@ops/ui/composites/ConfirmDialog'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { catalogFor } from '../../../../../i18n/locale'
import { useLocale } from '../../../../../i18n/locale-context'
import { PORTAL_CLIENT_COPY } from '../../../../../i18n/portal-copy'
import { answerQuote } from '../../../../../server/actions/billing/portal-public'

/** Accept, or decline after a confirmation. The page reloads with the new state. */
export function QuoteAnswer({ token, quoteId }: Readonly<{ token: string; quoteId: string }>) {
  const copy = catalogFor(PORTAL_CLIENT_COPY, useLocale())
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, startAnswer] = useTransition()
  const answer = (decision: 'accept' | 'decline') =>
    new Promise<void>((resolve) => {
      startAnswer(async () => {
        const result = await answerQuote({ token, quoteId, decision })
        setError(result.ok ? '' : result.error.message)
        if (result.ok) router.refresh()
        resolve()
      })
    })
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Button
        disabled={pending}
        onClick={() => {
          void answer('accept')
        }}
      >
        {pending ? copy.answering : copy.accept}
      </Button>
      <ConfirmDialog
        title={copy.declineConfirm}
        labels={{ cancel: copy.back, confirm: copy.decline, confirming: copy.answering }}
        destructive
        onConfirm={() => answer('decline')}
        trigger={
          <Button variant="outline" disabled={pending} type="button">
            {copy.decline}
          </Button>
        }
      />
      {error === '' ? null : (
        <p className="basis-full text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

/** Opens the browser's print dialog, which also saves as PDF. */
export function PrintButton({ label }: Readonly<{ label: string }>) {
  return (
    <Button
      variant="outline"
      className="print:hidden"
      onClick={() => {
        window.print()
      }}
    >
      {label}
    </Button>
  )
}
