'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

type Outcome = { readonly ok: true } | { readonly ok: false; readonly error: { readonly message: string } }

/** Runs a settings save, shows "Saved." or the error, and refreshes the page data. */
export function useSave(action: (input: unknown) => Promise<Outcome>) {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const save = (input: unknown) => {
    startTransition(async () => {
      const result = await action(input)
      setMessage(result.ok ? 'Saved.' : result.error.message)
      if (result.ok) router.refresh()
    })
  }
  return { save, message, pending }
}
