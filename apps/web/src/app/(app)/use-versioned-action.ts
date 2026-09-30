'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Outcome =
  { readonly ok: true } | { readonly ok: false; readonly error: { readonly code: string; readonly message: string } }

/**
 * Runs a save that carries the record's `expectedUpdatedAt`. While it runs `pending` is true; a failure sets `error`,
 * and a version CONFLICT also refreshes the page so the user sees what changed; `refreshOnSuccess` refreshes after a
 * good save too. `run` resolves to the successful result, or null when the save failed.
 */
export function useVersionedAction({ refreshOnSuccess = false }: Readonly<{ refreshOnSuccess?: boolean }> = {}) {
  const router = useRouter()
  const [error, setError] = useState<string | undefined>()
  const [pending, setPending] = useState(false)
  const run = async <R extends Outcome>(action: () => Promise<R>): Promise<Extract<R, { ok: true }> | null> => {
    setError(undefined)
    setPending(true)
    const result = await action()
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
