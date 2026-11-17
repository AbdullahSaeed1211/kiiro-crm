'use client'

import type { VoiceCall } from '@ops/module-crm'

export function MinimizedCall({
  call,
  onOpen,
  label,
}: Readonly<{ call: VoiceCall; onOpen: () => void; label: string }>) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="fixed bottom-4 right-4 z-40 inline-flex h-11 items-center gap-2 rounded-full border bg-background px-4 text-sm font-medium shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`${label}: ${call.to}`}
    >
      <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
      {call.to}
    </button>
  )
}
