'use client'

import { useState } from 'react'
import { Button } from '@ops/ui/components/ui/button'

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
    <Button variant="outline" size="lg" type="button" onClick={() => void markRead()}>
      {label}
    </Button>
  )
}
