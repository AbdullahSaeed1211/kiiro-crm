'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@ops/ui/components/ui/button'
import { ErrorState } from '@ops/ui/composites/ErrorState'
import { ERROR_COPY } from '@/i18n/error-copy'
import { useLocale } from '@/i18n/locale-context'

/** A failed read stays distinct from an empty list and can be retried in its current URL context. */
export function LoadFailure({ title }: Readonly<{ title: string }>) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const copy = ERROR_COPY[useLocale()]
  return (
    <div className="rounded-xl border bg-card py-8">
      <ErrorState
        title={title}
        description={copy.loadFailed}
        action={
          <Button
            disabled={pending}
            onClick={() => {
              startTransition(() => {
                router.refresh()
              })
            }}
          >
            {pending ? copy.retrying : copy.retry}
          </Button>
        }
      />
    </div>
  )
}
