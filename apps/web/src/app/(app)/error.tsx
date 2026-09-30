'use client'

import { Button } from '@ops/ui/components/ui/button'
import { ErrorState } from '@ops/ui/composites/ErrorState'
import { useEffect } from 'react'
import { isStaleAssetError, reloadOnce } from './stale-assets'

/** Error boundary for every signed-in page: the sidebar stays, and the page offers a retry instead of going blank. */
export default function AppError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  const stale = isStaleAssetError(error)
  const reference = error.digest === undefined ? '' : ` (${error.digest})`
  useEffect(() => {
    if (stale) reloadOnce()
  }, [stale])
  return (
    <div className="flex min-h-svh flex-col px-4 py-3 md:px-6 md:py-4">
      <ErrorState
        title={stale ? 'A newer version is available' : 'This page could not be shown'}
        description={stale ? 'Reloading to pick up the latest version.' : `Something went wrong.${reference}`}
        action={<Button onClick={stale ? reloadOnce : reset}>{stale ? 'Reload' : 'Try again'}</Button>}
      />
    </div>
  )
}
