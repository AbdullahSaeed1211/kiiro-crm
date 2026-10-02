'use client'

import { Button } from '@ops/ui/components/ui/button'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useGuardedTransition } from '../../use-guarded-transition'
import { ARCHIVE_COPY } from '../../../../i18n/archive-copy'
import { catalogFor } from '../../../../i18n/locale'
import { useLocale } from '../../../../i18n/locale-context'
import { restoreWorkAction } from '../../../../server/actions/work/archive'
import { restoreRecordAction } from '../../../../server/crm/archive'

/** Puts one archived record back and refreshes the list. */
export function RestoreButton({
  type,
  id,
  updatedAt,
}: Readonly<{
  type: 'organization' | 'contact' | 'lead' | 'deal' | 'task' | 'project'
  id: string
  updatedAt: number
}>) {
  const copy = catalogFor(ARCHIVE_COPY, useLocale())
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useGuardedTransition(setMessage)
  return (
    <span className="inline-flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const restore = type === 'task' || type === 'project' ? restoreWorkAction : restoreRecordAction
            const result = await restore({ type, id, expectedUpdatedAt: updatedAt })
            if (result.ok) router.refresh()
            else setMessage(result.error.message)
          })
        }}
      >
        {copy.restore}
      </Button>
      {message === null ? null : (
        <span role="alert" className="text-xs text-destructive">
          {message}
        </span>
      )}
    </span>
  )
}
