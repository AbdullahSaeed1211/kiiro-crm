'use client'

import { useState } from 'react'

export function EmailReadButton({
  messageId,
  initialRead,
  label,
}: Readonly<{ messageId: string; initialRead: boolean; label: string }>) {
  const [read, setRead] = useState(initialRead)
  if (read) return null
  const markRead = async () => {
    const response = await fetch(`/api/v1/email/${encodeURIComponent(messageId)}/read`, { method: 'PATCH' })
    if (response.ok) setRead(true)
  }
  return (
    <button
      className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      type="button"
      onClick={() => void markRead()}
    >
      {label}
    </button>
  )
}
