'use client'

import { Button } from '@ops/ui/components/ui/button'

/** The save button and its status line under a settings form that saves as a whole. */
export function SaveBar({
  pending,
  label,
  pendingLabel,
  message,
  onSave,
}: Readonly<{
  pending: boolean
  label: string
  pendingLabel: string
  message: string | undefined
  onSave: () => void
}>) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="lg" type="button" onClick={onSave} disabled={pending}>
        {pending ? pendingLabel : label}
      </Button>
      {message ? (
        <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
          {message}
        </p>
      ) : null}
    </div>
  )
}
