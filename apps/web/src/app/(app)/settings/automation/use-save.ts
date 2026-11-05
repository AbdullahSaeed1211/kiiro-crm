'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { catalogFor } from '../../../../i18n/locale'
import { useLocale } from '../../../../i18n/locale-context'
import { AUTOMATION_COPY } from '../../../../i18n/automation-copy'
import { useGuardedTransition } from '../../use-guarded-transition'

type Outcome = { readonly ok: true } | { readonly ok: false; readonly error: { readonly message: string } }

/** Runs the settings save, shows "Saved." or the error, and refreshes the page data. */
export function useSave(action: (input: unknown) => Promise<Outcome>) {
  const router = useRouter()
  const { saved } = catalogFor(AUTOMATION_COPY, useLocale())
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useGuardedTransition(setMessage)
  const save = (input: unknown) => {
    startTransition(async () => {
      const result = await action(input)
      setMessage(result.ok ? saved : result.error.message)
      if (result.ok) router.refresh()
    })
  }
  return { save, message, pending }
}
