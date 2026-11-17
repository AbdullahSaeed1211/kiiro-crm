'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@ops/ui/components/ui/tooltip'
import { Phone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CALLING_COPY } from '../../../i18n/calling-copy'
import { useLocale } from '../../../i18n/locale-context'
import { useVoice } from './voice-context-state'

function durationText(startedAt: number, now: number): string {
  const elapsed = Math.max(0, now - startedAt)
  const minutes = String(Math.floor(elapsed / 60_000)).padStart(2, '0')
  const seconds = String(Math.floor(elapsed / 1000) % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

function headerStatus({
  active,
  configured,
  receiving,
  assigned,
  copy,
}: Readonly<{
  active: boolean
  configured: boolean
  receiving: boolean
  assigned: boolean
  copy: (typeof CALLING_COPY)['en']
}>): string {
  if (active) return copy.live
  if (receiving) return copy.receivingCalls
  if (configured && assigned) return copy.notReceivingCalls
  if (configured) return copy.dialer
  return copy.unavailable
}

/** Fixed-width global call action; live status never changes its footprint. */
export function CallingHeaderAction() {
  const copy = CALLING_COPY[useLocale()]
  const { snapshot, activeCall, receivingCalls, open } = useVoice()
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (activeCall?.state !== 'active') return
    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => {
      window.clearInterval(timer)
    }
  }, [activeCall?.state])
  const isActive = activeCall?.state === 'active'
  const duration = isActive ? durationText(activeCall.answeredAt ?? activeCall.createdAt, now) : copy.call
  const assignedInbound =
    snapshot?.settings.enabled === true &&
    snapshot.numbers.some(
      (number) => number.status === 'active' && number.inboundEnabled && number.assigneeIds.includes(snapshot.userId),
    )
  const status = headerStatus({
    active: isActive,
    configured: snapshot?.configured === true,
    receiving: receivingCalls,
    assigned: assignedInbound,
    copy,
  })
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="h-8 w-[5.5rem] justify-start gap-2 px-2"
            aria-label={copy.dialer}
            onClick={() => {
              open()
            }}
          />
        }
      >
        <Phone aria-hidden className="size-4 shrink-0" />
        <span className="w-8 truncate text-left text-xs tabular-nums" aria-hidden>
          {duration}
        </span>
      </TooltipTrigger>
      <TooltipContent>{status}</TooltipContent>
    </Tooltip>
  )
}
