'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { catalogFor } from '../../i18n/locale'
import { ERROR_COPY } from '../../i18n/error-copy'
import { useLocale } from '../../i18n/locale-context'
import { describeClientError } from './client-errors'

type Outcome =
  { readonly ok: true } | { readonly ok: false; readonly error: { readonly code: string; readonly message: string } }

/**
 * Runs a save that carries the record's `expectedUpdatedAt`. While it runs `pending` is true; a failure sets `error`,
 * and a version CONFLICT also refreshes the page so the user sees what changed; `refreshOnSuccess` refreshes after a
 * good save too. `run` resolves to the successful result, or null when the save failed.
 */
export function useVersionedAction({ refreshOnSuccess = false }: Readonly<{ refreshOnSuccess?: boolean }> = {}) {
  const router = useRouter()
  const locale = useLocale()
  const [error, setError] = useState<string | undefined>()
  const [pending, setPending] = useState(false)
  const run = async <R extends Outcome>(action: () => Promise<R>): Promise<Extract<R, { ok: true }> | null> => {
    setError(undefined)
    setPending(true)
    let result: R
    try {
      result = await action()
    } catch (caught) {
      // The request failed before the server answered: show why, and let the person try again.
      setPending(false)
      setError(
        describeClientError(caught, {
          context: 'versioned save',
          fallback: catalogFor(ERROR_COPY, locale).saveFailed,
          locale,
        }),
      )
      return null
    }
    setPending(false)
    if (result.ok) {
      if (refreshOnSuccess) router.refresh()
      return result as Extract<R, { ok: true }>
    }
    setError(result.error.message)
    if (result.error.code === 'CONFLICT') router.refresh()
    return null
  }
  return { run, error, pending }
}
