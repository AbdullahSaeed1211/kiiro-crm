'use client'

import { Button } from '@ops/ui/components/ui/button'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { restoreRecordAction } from '../../../../server/crm/archive'

/** Puts one archived record back and refreshes the list. */
export function RestoreButton({
  type,
  id,
  updatedAt,
}: Readonly<{ type: 'organization' | 'contact' | 'lead' | 'deal'; id: string; updatedAt: number }>) {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  return (
    <span className="inline-flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const result = await restoreRecordAction({ type, id, expectedUpdatedAt: updatedAt })
            if (result.ok) router.refresh()
            else setMessage(result.error.message)
          })
        }}
      >
        Restore
      </Button>
      {message === null ? null : (
        <span role="alert" className="text-xs text-destructive">
          {message}
        </span>
      )}
    </span>
  )
}
