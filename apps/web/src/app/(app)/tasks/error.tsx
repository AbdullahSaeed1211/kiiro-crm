'use client'

import { Button } from '@ops/ui/components/ui/button'
import { ErrorState } from '@ops/ui/composites/ErrorState'

/** Error boundary of the tasks list; retry re-renders the route segment. */
export default function TasksError({ reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <div className="flex min-h-svh flex-col px-4 py-3 md:px-6 md:py-4">
      <ErrorState
        title="Tasks could not be loaded"
        description="Something went wrong while loading this page."
        action={<Button onClick={reset}>Try again</Button>}
      />
    </div>
  )
}
