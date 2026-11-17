'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Phone } from 'lucide-react'
import { useVoice } from './voice-context-state'

/** Starts the dialer with only the lead's already-visible phone number and record id. */
export function LeadCallAction({
  phone,
  leadId,
  leadName,
  label,
}: Readonly<{ phone: string; leadId: string; leadName: string; label: string }>) {
  const { open, snapshot } = useVoice()
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        open({ number: phone, leadId, leadName })
      }}
    >
      <Phone aria-hidden />
      {label}
      {snapshot?.configured ? null : <span className="sr-only">Calling is unavailable</span>}
    </Button>
  )
}
