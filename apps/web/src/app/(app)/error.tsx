'use client'

import { Button } from '@ops/ui/components/ui/button'
import { ErrorState } from '@ops/ui/composites/ErrorState'
import { useEffect } from 'react'
import { isStaleAssetError, reloadOnce } from './stale-assets'
import { ERROR_COPY } from '@/i18n/error-copy'
import { useLocale } from '@/i18n/locale-context'

/** Error boundary for every signed-in page: the sidebar stays, and the page offers a retry instead of going blank. */
export default function AppError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  const stale = isStaleAssetError(error)
  const copy = ERROR_COPY[useLocale()]
  const reference = error.digest === undefined ? '' : ` (${error.digest})`
  useEffect(() => {
    if (stale) reloadOnce()
  }, [stale])
  return (
    <div className="flex flex-1 flex-col px-4 py-8 md:px-6">
      <ErrorState
        title={stale ? copy.newerVersion : copy.pageFailed}
        description={stale ? copy.reloading : `${copy.loadFailed}${reference}`}
        action={<Button onClick={stale ? reloadOnce : reset}>{stale ? copy.reload : copy.retry}</Button>}
      />
    </div>
  )
}
